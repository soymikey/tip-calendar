import type { Preferences, Restaurant, TipOutRule } from "../domain/restaurant"
import {
  calculateShiftIncome,
  type IncomeSnapshot,
  type PaySnapshot,
  type Shift,
  type TipOutSnapshot,
} from "../domain/shift"
import { emptyState, type AppState } from "./types"

export type PersistMode = "load" | "import"

const BACKUP_ERROR = "This file is not a Tips Calendar backup."

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function tipOutOverrideFromV1Rule(rule: unknown): TipOutRule {
  if (!isRecord(rule) || typeof rule.type !== "string") {
    return { type: "none" }
  }
  if (rule.type === "fixed") {
    return { type: "fixed", amountCents: asNumber(rule.amountCents) }
  }
  if (rule.type === "sales_percent" || rule.type === "tips_percent") {
    return { type: rule.type, percent: asNumber(rule.percent) }
  }
  return { type: "none" }
}

function flattenTipOutSnapshot(
  snapshot: unknown,
  shift: Record<string, unknown>,
): TipOutSnapshot {
  const raw = isRecord(snapshot) ? snapshot : {}
  const rule = isRecord(raw.rule) ? raw.rule : {}
  const amountCents = asNumber(raw.amountCents)
  if (rule.type === "tips_percent") {
    return {
      type: "tips_percent",
      baseAmountCents: asNumber(shift.cashTipsCents) + asNumber(shift.cardTipsCents),
      percent: asNumber(rule.percent),
      amountCents,
    }
  }
  if (rule.type === "sales_percent") {
    const baseAmountCents =
      typeof raw.salesCents === "number" && Number.isFinite(raw.salesCents)
        ? raw.salesCents
        : asNumber(shift.salesCents)
    return {
      type: "sales_percent",
      baseAmountCents,
      percent: asNumber(rule.percent),
      amountCents,
    }
  }
  if (rule.type === "fixed") {
    return { type: "fixed", amountCents }
  }
  return { type: "none", amountCents: 0 }
}

function paySnapshotForShift(
  shift: Record<string, unknown>,
  restaurant: Restaurant | undefined,
): PaySnapshot {
  const snap = isRecord(shift.paySnapshot) ? shift.paySnapshot : undefined
  if (snap && (snap.payType === "hourly" || snap.payType === "fixed" || snap.payType === "none")) {
    return {
      payType: snap.payType,
      payAmountCents: asNumber(snap.payAmountCents),
    }
  }
  if (restaurant) {
    return { payType: restaurant.payType, payAmountCents: restaurant.payAmountCents }
  }
  return { payType: "none", payAmountCents: 0 }
}

function stripIsDefault(restaurant: Record<string, unknown>): Restaurant {
  const { isDefault: _isDefault, ...rest } = restaurant
  return rest as Restaurant
}

function migrateRestaurants(raw: unknown): {
  restaurants: Restaurant[]
  rawRestaurants: Record<string, unknown>[]
} {
  const rawRestaurants = Array.isArray(raw) ? raw.filter(isRecord) : []
  return { restaurants: rawRestaurants.map(stripIsDefault), rawRestaurants }
}

function resolveDefaultRestaurantId(
  restaurants: Restaurant[],
  rawRestaurants: Record<string, unknown>[],
  preferences: unknown,
): string | null {
  if (isRecord(preferences) && typeof preferences.defaultRestaurantId === "string") {
    const existing = preferences.defaultRestaurantId
    if (restaurants.some((item) => item.id === existing)) {
      return existing
    }
  }
  const flagged = rawRestaurants.find((item) => item.isDefault === true)
  return (typeof flagged?.id === "string" ? flagged.id : null) ?? restaurants[0]?.id ?? null
}

function isFlattenedV2Shift(shift: Record<string, unknown>): boolean {
  if (!isRecord(shift.incomeSnapshot)) {
    return false
  }
  const tipOut = shift.tipOutSnapshot
  return isRecord(tipOut) && typeof tipOut.type === "string" && !("rule" in tipOut)
}

function hasIdAndLocalDate(
  shift: unknown,
): shift is Record<string, unknown> & { id: string; localDate: string } {
  return isRecord(shift) && typeof shift.id === "string" && typeof shift.localDate === "string"
}

function migrateShift(raw: Record<string, unknown>, restaurants: Restaurant[]): Shift {
  const restaurant =
    typeof raw.restaurantId === "string"
      ? restaurants.find((item) => item.id === raw.restaurantId)
      : undefined
  const restaurantName = restaurant?.name ?? "Unknown restaurant"
  const paySnapshot = paySnapshotForShift(raw, restaurant)
  const v1Snapshot = raw.tipOutSnapshot
  const rule = isRecord(v1Snapshot) ? v1Snapshot.rule : undefined
  const hours = asNumber(raw.hours)
  const unpaidBreakHours = asNumber(raw.unpaidBreakHours)
  const cashTipsCents = asNumber(raw.cashTipsCents)
  const cardTipsCents = asNumber(raw.cardTipsCents)
  const otherIncomeCents = asNumber(raw.otherIncomeCents)
  const salesCents =
    typeof raw.salesCents === "number" && Number.isFinite(raw.salesCents)
      ? raw.salesCents
      : isRecord(v1Snapshot) && typeof v1Snapshot.salesCents === "number"
        ? v1Snapshot.salesCents
        : undefined
  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString()
  const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : createdAt
  const income = calculateShiftIncome({
    restaurant: {
      id: typeof raw.restaurantId === "string" ? raw.restaurantId : "snapshot",
      name: restaurantName,
      payType: paySnapshot.payType,
      payAmountCents: paySnapshot.payAmountCents,
      creditCardTipPayout: "same_day",
      defaultTipOutRule: { type: "none" },
      createdAt,
      updatedAt,
    },
    hours,
    unpaidBreakHours,
    cashTipsCents,
    cardTipsCents,
    otherIncomeCents,
    salesCents,
    tipOutOverride: tipOutOverrideFromV1Rule(rule),
  })
  const incomeSnapshot: IncomeSnapshot = {
    totalTipsCents: income.totalTipsCents,
    wageIncomeCents: income.wageIncomeCents,
    otherIncomeCents: income.otherIncomeCents,
    grossIncomeCents: income.grossIncomeCents,
    tipOutCents: income.tipOutCents,
    netIncomeCents: income.netIncomeCents,
    effectiveHours: income.effectiveHours,
    effectiveHourlyCents: income.effectiveHourlyCents,
  }
  return {
    id: raw.id as string,
    localDate: raw.localDate as string,
    restaurantId: typeof raw.restaurantId === "string" ? raw.restaurantId : "",
    restaurantName,
    hours,
    unpaidBreakHours,
    clockIn: typeof raw.clockIn === "string" ? raw.clockIn : undefined,
    clockOut: typeof raw.clockOut === "string" ? raw.clockOut : undefined,
    overnight: raw.overnight === true,
    cashTipsCents,
    cardTipsCents,
    otherIncomeCents,
    salesCents,
    tipOutSnapshot: flattenTipOutSnapshot(v1Snapshot, raw),
    paySnapshot,
    incomeSnapshot,
    note: typeof raw.note === "string" ? raw.note : undefined,
    tag: raw.tag === "lunch" || raw.tag === "dinner" ? raw.tag : undefined,
    createdAt,
    updatedAt,
  }
}

export function migrateToV2(v1: unknown, mode: PersistMode): AppState {
  if (!isRecord(v1)) {
    if (mode === "load") {
      return emptyState
    }
    throw new Error(BACKUP_ERROR)
  }

  const { restaurants, rawRestaurants } = migrateRestaurants(v1.restaurants)
  const defaultRestaurantId = resolveDefaultRestaurantId(
    restaurants,
    rawRestaurants,
    v1.preferences,
  )
  const rawShifts = Array.isArray(v1.shifts) ? v1.shifts : []
  const shifts: Shift[] = []
  for (const item of rawShifts) {
    if (!hasIdAndLocalDate(item)) {
      if (mode === "import") {
        throw new Error(BACKUP_ERROR)
      }
      continue
    }
    shifts.push(isFlattenedV2Shift(item) ? (item as Shift) : migrateShift(item, restaurants))
  }

  const preferences: Preferences = {
    ...emptyState.preferences,
    ...(isRecord(v1.preferences) ? v1.preferences : {}),
    defaultRestaurantId,
  }

  return {
    schemaVersion: 2,
    restaurants,
    shifts,
    preferences,
  }
}

export function isRecognizedPersistedDocument(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }
  if (value.schemaVersion === 2 && Array.isArray(value.restaurants) && Array.isArray(value.shifts)) {
    return true
  }
  return value.version === 1 && !("schemaVersion" in value)
}

export function parsePersistedState(value: unknown, mode: PersistMode): AppState {
  if (!isRecord(value)) {
    if (mode === "load") {
      return emptyState
    }
    throw new Error(BACKUP_ERROR)
  }

  if (value.schemaVersion === 2 && Array.isArray(value.restaurants) && Array.isArray(value.shifts)) {
    return {
      schemaVersion: 2,
      restaurants: value.restaurants as Restaurant[],
      shifts: value.shifts as Shift[],
      preferences: {
        ...emptyState.preferences,
        ...(isRecord(value.preferences) ? value.preferences : {}),
      },
    }
  }

  if (value.version === 1 && !("schemaVersion" in value)) {
    return migrateToV2(value, mode)
  }

  if (mode === "load") {
    return emptyState
  }
  throw new Error(BACKUP_ERROR)
}
