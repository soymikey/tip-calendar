import { parseLocalDate } from "./calendar"
import type { Cents } from "./money"
import { addCents } from "./money"
import type { PayType, Restaurant, ShiftTag, TipOutRule } from "./restaurant"

export type TipOutSnapshot =
  | { type: "none"; amountCents: 0 }
  | { type: "fixed"; amountCents: Cents }
  | { type: "sales_percent"; baseAmountCents: Cents; percent: number; amountCents: Cents }
  | { type: "tips_percent"; baseAmountCents: Cents; percent: number; amountCents: Cents }
  | { type: "manual"; amountCents: Cents }

export type PaySnapshot = {
  payType: PayType
  payAmountCents: Cents
}

export type IncomeSnapshot = {
  totalTipsCents: Cents
  wageIncomeCents: Cents
  otherIncomeCents: Cents
  grossIncomeCents: Cents
  tipOutCents: Cents
  netIncomeCents: Cents
  effectiveHours: number
  effectiveHourlyCents: Cents | null
}

export type Shift = {
  id: string
  localDate: string
  restaurantId: string
  restaurantName: string
  hours: number
  unpaidBreakHours: number
  clockIn?: string
  clockOut?: string
  overnight: boolean
  cashTipsCents: Cents
  cardTipsCents: Cents
  otherIncomeCents: Cents
  salesCents?: Cents
  tipOutSnapshot: TipOutSnapshot
  paySnapshot: PaySnapshot
  incomeSnapshot: IncomeSnapshot
  note?: string
  tag?: ShiftTag
  createdAt: string
  updatedAt: string
}

export type ManualTipOut = { type: "manual"; amountCents: Cents }

export function tipOutRuleFromSnapshot(
  snapshot: TipOutSnapshot,
): TipOutRule | ManualTipOut {
  if (snapshot.type === "sales_percent" || snapshot.type === "tips_percent") {
    return { type: snapshot.type, percent: snapshot.percent }
  }
  if (snapshot.type === "fixed") {
    return { type: "fixed", amountCents: snapshot.amountCents }
  }
  if (snapshot.type === "manual") {
    return { type: "manual", amountCents: snapshot.amountCents }
  }
  return { type: "none" }
}

export function createShift(input: {
  localDate: string
  restaurantId: string
  restaurantName: string
  hours: number
  unpaidBreakHours?: number
  overnight?: boolean
  cashTipsCents?: Cents
  cardTipsCents?: Cents
  otherIncomeCents?: Cents
  salesCents?: Cents
  tipOutSnapshot: TipOutSnapshot
  paySnapshot: PaySnapshot
  incomeSnapshot?: IncomeSnapshot
  note?: string
  tag?: ShiftTag
  clockIn?: string
  clockOut?: string
  now?: string
  id?: string
}): Shift {
  parseLocalDate(input.localDate)
  if (!Number.isFinite(input.hours) || input.hours < 0) {
    throw new Error("Hours must be a finite number")
  }
  const now = input.now ?? new Date().toISOString()
  const cashTipsCents = input.cashTipsCents ?? 0
  const cardTipsCents = input.cardTipsCents ?? 0
  const otherIncomeCents = input.otherIncomeCents ?? 0
  const unpaidBreakHours = input.unpaidBreakHours ?? 0
  const overnight = input.overnight ?? false
  const incomeSnapshot =
    input.incomeSnapshot ??
    incomeSnapshotFromParts({
      paySnapshot: input.paySnapshot,
      tipOutSnapshot: input.tipOutSnapshot,
      hours: input.hours,
      unpaidBreakHours,
      cashTipsCents,
      cardTipsCents,
      otherIncomeCents,
      salesCents: input.salesCents,
    })
  return {
    id: input.id ?? crypto.randomUUID(),
    localDate: input.localDate,
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    hours: input.hours,
    unpaidBreakHours,
    clockIn: input.clockIn,
    clockOut: input.clockOut,
    overnight,
    cashTipsCents,
    cardTipsCents,
    otherIncomeCents,
    salesCents: input.salesCents,
    tipOutSnapshot: input.tipOutSnapshot,
    paySnapshot: input.paySnapshot,
    incomeSnapshot,
    note: input.note,
    tag: input.tag,
    createdAt: now,
    updatedAt: now,
  }
}

export type ShiftIncomeInput = {
  restaurant: Restaurant
  hours: number
  unpaidBreakHours?: number
  cashTipsCents: Cents
  cardTipsCents: Cents
  otherIncomeCents?: Cents
  salesCents?: Cents
  tipOutOverride?: TipOutRule | ManualTipOut
}

export type ShiftIncome = {
  totalTipsCents: Cents
  wageIncomeCents: Cents
  otherIncomeCents: Cents
  grossIncomeCents: Cents
  tipOutCents: Cents
  netIncomeCents: Cents
  effectiveHours: number
  effectiveHourlyCents: Cents | null
  tipOutSnapshot: TipOutSnapshot
}

function parseMinutes(clock: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(clock)
  if (!match) {
    throw new Error("Time must use HH:mm")
  }
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) {
    throw new Error("Time must use HH:mm")
  }
  return hours * 60 + minutes
}

export function calculateHoursFromClock(
  clockIn: string,
  clockOut: string,
): { hours: number; overnight: boolean } {
  const start = parseMinutes(clockIn)
  const end = parseMinutes(clockOut)
  const overnight = end < start
  const minutes = overnight ? 24 * 60 - start + end : end - start
  return { hours: minutes / 60, overnight }
}

export function calculateEffectiveHours(rawHours: number, unpaidBreakHours = 0): number {
  if (!Number.isFinite(rawHours) || !Number.isFinite(unpaidBreakHours)) {
    throw new Error("Hours must be finite")
  }
  return Math.max(0, rawHours - unpaidBreakHours)
}

function calculateTipOutCents(input: {
  rule: TipOutRule | ManualTipOut
  totalTipsCents: Cents
  salesCents?: Cents
}): { amountCents: Cents; snapshot: TipOutSnapshot } {
  if (input.rule.type === "manual") {
    return {
      amountCents: input.rule.amountCents,
      snapshot: { type: "manual", amountCents: input.rule.amountCents },
    }
  }

  if (input.rule.type === "none") {
    return { amountCents: 0, snapshot: { type: "none", amountCents: 0 } }
  }

  if (input.rule.type === "fixed") {
    return {
      amountCents: input.rule.amountCents,
      snapshot: { type: "fixed", amountCents: input.rule.amountCents },
    }
  }

  if (input.rule.type === "sales_percent") {
    const salesCents = input.salesCents ?? 0
    const amountCents = Math.round((salesCents * input.rule.percent) / 100)
    return {
      amountCents,
      snapshot: {
        type: "sales_percent",
        baseAmountCents: salesCents,
        percent: input.rule.percent,
        amountCents,
      },
    }
  }

  const amountCents = Math.round((input.totalTipsCents * input.rule.percent) / 100)
  return {
    amountCents,
    snapshot: {
      type: "tips_percent",
      baseAmountCents: input.totalTipsCents,
      percent: input.rule.percent,
      amountCents,
    },
  }
}

export function calculateShiftIncome(input: ShiftIncomeInput): ShiftIncome {
  const effectiveHours = calculateEffectiveHours(input.hours, input.unpaidBreakHours ?? 0)
  const totalTipsCents = addCents(input.cashTipsCents, input.cardTipsCents)
  const otherIncomeCents = input.otherIncomeCents ?? 0

  let wageIncomeCents = 0
  if (input.restaurant.payType === "hourly") {
    wageIncomeCents = Math.round(input.restaurant.payAmountCents * effectiveHours)
  } else if (input.restaurant.payType === "fixed") {
    wageIncomeCents = input.restaurant.payAmountCents
  }

  const rule = input.tipOutOverride ?? input.restaurant.defaultTipOutRule
  const tipOut = calculateTipOutCents({
    rule,
    totalTipsCents,
    salesCents: input.salesCents,
  })

  const grossIncomeCents = addCents(totalTipsCents, wageIncomeCents, otherIncomeCents)
  const netIncomeCents = grossIncomeCents - tipOut.amountCents
  const effectiveHourlyCents =
    effectiveHours > 0 ? Math.round(netIncomeCents / effectiveHours) : null

  return {
    totalTipsCents,
    wageIncomeCents,
    otherIncomeCents,
    grossIncomeCents,
    tipOutCents: tipOut.amountCents,
    netIncomeCents,
    effectiveHours,
    effectiveHourlyCents,
    tipOutSnapshot: tipOut.snapshot,
  }
}

export function incomeSnapshotFromParts(input: {
  paySnapshot: PaySnapshot
  tipOutSnapshot: TipOutSnapshot
  hours: number
  unpaidBreakHours: number
  cashTipsCents: Cents
  cardTipsCents: Cents
  otherIncomeCents: Cents
  salesCents?: Cents
}): IncomeSnapshot {
  const now = new Date().toISOString()
  const restaurant: Restaurant = {
    id: "snapshot",
    name: "snapshot",
    payType: input.paySnapshot.payType,
    payAmountCents: input.paySnapshot.payAmountCents,
    creditCardTipPayout: "same_day",
    defaultTipOutRule: { type: "none" },
    createdAt: now,
    updatedAt: now,
  }
  const income = calculateShiftIncome({
    restaurant,
    hours: input.hours,
    unpaidBreakHours: input.unpaidBreakHours,
    cashTipsCents: input.cashTipsCents,
    cardTipsCents: input.cardTipsCents,
    otherIncomeCents: input.otherIncomeCents,
    salesCents: input.salesCents,
    tipOutOverride: tipOutRuleFromSnapshot(input.tipOutSnapshot),
  })
  return {
    totalTipsCents: income.totalTipsCents,
    wageIncomeCents: income.wageIncomeCents,
    otherIncomeCents: income.otherIncomeCents,
    grossIncomeCents: income.grossIncomeCents,
    tipOutCents: income.tipOutCents,
    netIncomeCents: income.netIncomeCents,
    effectiveHours: income.effectiveHours,
    effectiveHourlyCents: income.effectiveHourlyCents,
  }
}
