import type { Cents } from "./money"
import { addCents } from "./money"
import type { Restaurant, ShiftTag, TipOutRule } from "./restaurant"

export type TipOutSnapshot = {
  rule: TipOutRule
  salesCents?: Cents
  amountCents: Cents
}

export type Shift = {
  id: string
  localDate: string
  restaurantId: string
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
  note?: string
  tag?: ShiftTag
  createdAt: string
  updatedAt: string
}

export type ManualTipOut = { type: "manual"; amountCents: Cents }

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
      snapshot: {
        rule: { type: "fixed", amountCents: input.rule.amountCents },
        amountCents: input.rule.amountCents,
      },
    }
  }

  if (input.rule.type === "none") {
    return { amountCents: 0, snapshot: { rule: input.rule, amountCents: 0 } }
  }

  if (input.rule.type === "fixed") {
    return {
      amountCents: input.rule.amountCents,
      snapshot: { rule: input.rule, amountCents: input.rule.amountCents },
    }
  }

  if (input.rule.type === "sales_percent") {
    const salesCents = input.salesCents ?? 0
    const amountCents = Math.round((salesCents * input.rule.percent) / 100)
    return {
      amountCents,
      snapshot: { rule: input.rule, salesCents, amountCents },
    }
  }

  const amountCents = Math.round((input.totalTipsCents * input.rule.percent) / 100)
  return {
    amountCents,
    snapshot: { rule: input.rule, amountCents },
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
