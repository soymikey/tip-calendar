import type { Restaurant } from "../domain/restaurant"
import type { Shift } from "../domain/shift"
import { emptyState, type AppState } from "./types"

export type PersistMode = "load" | "import"

const BACKUP_ERROR = "This file is not a Tips Calendar backup."

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isRecognizedPersistedDocument(value: unknown): value is Record<string, unknown> & {
  restaurants: unknown[]
  shifts: unknown[]
} {
  return (
    isRecord(value) &&
    value.schemaVersion === 2 &&
    Array.isArray(value.restaurants) &&
    Array.isArray(value.shifts)
  )
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isRestaurant(value: unknown): value is Restaurant {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    (value.payType === "hourly" || value.payType === "fixed" || value.payType === "none") &&
    isNumber(value.payAmountCents) &&
    (value.creditCardTipPayout === "same_day" || value.creditCardTipPayout === "paycheck") &&
    isRecord(value.defaultTipOutRule) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  )
}

function isIncomeSnapshot(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNumber(value.totalTipsCents) &&
    isNumber(value.wageIncomeCents) &&
    isNumber(value.otherIncomeCents) &&
    isNumber(value.grossIncomeCents) &&
    isNumber(value.tipOutCents) &&
    isNumber(value.netIncomeCents) &&
    isNumber(value.effectiveHours) &&
    (value.effectiveHourlyCents === null || isNumber(value.effectiveHourlyCents))
  )
}

function isShift(value: unknown): value is Shift {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.localDate) &&
    isString(value.restaurantId) &&
    isString(value.restaurantName) &&
    isNumber(value.hours) &&
    isNumber(value.unpaidBreakHours) &&
    typeof value.overnight === "boolean" &&
    isNumber(value.cashTipsCents) &&
    isNumber(value.cardTipsCents) &&
    isNumber(value.otherIncomeCents) &&
    isRecord(value.tipOutSnapshot) &&
    isRecord(value.paySnapshot) &&
    isIncomeSnapshot(value.incomeSnapshot) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  )
}

export function parsePersistedState(value: unknown, mode: PersistMode): AppState {
  if (!isRecognizedPersistedDocument(value)) {
    if (mode === "load") {
      return emptyState
    }
    throw new Error(BACKUP_ERROR)
  }

  if (!value.restaurants.every(isRestaurant) || !value.shifts.every(isShift)) {
    if (mode === "load") {
      return emptyState
    }
    throw new Error(BACKUP_ERROR)
  }

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
