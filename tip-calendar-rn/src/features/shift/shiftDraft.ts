import type { PayType, Restaurant, ShiftTag, TipOutRule } from "../../domain/restaurant"
import {
  calculateHoursFromClock,
  calculateShiftIncome,
  createShift,
  tipOutRuleFromSnapshot,
  type ManualTipOut,
  type Shift,
  type ShiftIncome,
} from "../../domain/shift"

export type ShiftDraft = {
  localDate: string
  restaurantId: string
  hours: number
  cashTipsCents: number
  cardTipsCents: number
  unpaidBreakHours?: number
  otherIncomeCents?: number
  salesCents?: number
  note?: string
  tag?: ShiftTag
  clockIn?: string
  clockOut?: string
  useClock?: boolean
  payType?: PayType
  payAmountCents?: number
  tipOutRule?: TipOutRule | ManualTipOut
}

export function resolveShiftHours(draft: ShiftDraft): { hours: number; overnight: boolean } {
  if (draft.useClock) {
    if (!draft.clockIn || !draft.clockOut) {
      return { hours: 0, overnight: false }
    }
    return calculateHoursFromClock(draft.clockIn, draft.clockOut)
  }
  return { hours: draft.hours, overnight: false }
}

export function restaurantForDraft(restaurant: Restaurant, draft: ShiftDraft): Restaurant {
  return {
    ...restaurant,
    payType: draft.payType ?? restaurant.payType,
    payAmountCents: draft.payAmountCents ?? restaurant.payAmountCents,
  }
}

export function previewShiftIncome(draft: ShiftDraft, restaurant: Restaurant): ShiftIncome {
  const { hours } = resolveShiftHours(draft)
  return calculateShiftIncome({
    restaurant: restaurantForDraft(restaurant, draft),
    hours,
    unpaidBreakHours: draft.unpaidBreakHours ?? 0,
    cashTipsCents: draft.cashTipsCents,
    cardTipsCents: draft.cardTipsCents,
    otherIncomeCents: draft.otherIncomeCents ?? 0,
    salesCents: draft.salesCents,
    tipOutOverride: draft.tipOutRule,
  })
}

export function canSaveShift(draft: ShiftDraft): boolean {
  return resolveShiftHours(draft).hours > 0
}

export function toShift(
  draft: ShiftDraft,
  restaurant: Restaurant | undefined,
  now: string,
  existing?: Shift,
): Shift {
  const effectiveRestaurant =
    restaurant ??
    (existing
      ? {
          id: existing.restaurantId,
          name: existing.restaurantName,
          payType: draft.payType ?? existing.paySnapshot.payType,
          payAmountCents: draft.payAmountCents ?? existing.paySnapshot.payAmountCents,
          creditCardTipPayout: "same_day" as const,
          defaultTipOutRule: { type: "none" as const },
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        }
      : undefined)
  if (!effectiveRestaurant) {
    throw new Error("Restaurant is required to save a new shift")
  }
  const { hours, overnight } = resolveShiftHours(draft)
  const income = previewShiftIncome(draft, effectiveRestaurant)
  const paySource = restaurantForDraft(effectiveRestaurant, draft)
  return createShift({
    localDate: draft.localDate,
    restaurantId: effectiveRestaurant.id,
    restaurantName: restaurant?.name ?? existing?.restaurantName ?? effectiveRestaurant.name,
    hours,
    unpaidBreakHours: draft.unpaidBreakHours ?? 0,
    overnight,
    clockIn: draft.useClock ? draft.clockIn : undefined,
    clockOut: draft.useClock ? draft.clockOut : undefined,
    cashTipsCents: draft.cashTipsCents,
    cardTipsCents: draft.cardTipsCents,
    otherIncomeCents: draft.otherIncomeCents ?? 0,
    salesCents: draft.salesCents,
    tipOutSnapshot: income.tipOutSnapshot,
    paySnapshot: {
      payType: paySource.payType,
      payAmountCents: paySource.payAmountCents,
    },
    incomeSnapshot: {
      totalTipsCents: income.totalTipsCents,
      wageIncomeCents: income.wageIncomeCents,
      otherIncomeCents: income.otherIncomeCents,
      grossIncomeCents: income.grossIncomeCents,
      tipOutCents: income.tipOutCents,
      netIncomeCents: income.netIncomeCents,
      effectiveHours: income.effectiveHours,
      effectiveHourlyCents: income.effectiveHourlyCents,
    },
    note: draft.note?.trim() ? draft.note.trim() : undefined,
    tag: draft.tag,
    now,
  })
}

export function fromShift(shift: Shift, restaurant?: Restaurant): ShiftDraft {
  return {
    localDate: shift.localDate,
    restaurantId: shift.restaurantId,
    hours: shift.hours,
    cashTipsCents: shift.cashTipsCents,
    cardTipsCents: shift.cardTipsCents,
    unpaidBreakHours: shift.unpaidBreakHours,
    otherIncomeCents: shift.otherIncomeCents,
    salesCents: shift.salesCents,
    note: shift.note,
    tag: shift.tag,
    clockIn: shift.clockIn,
    clockOut: shift.clockOut,
    useClock: Boolean(shift.clockIn && shift.clockOut),
    payType: shift.paySnapshot.payType,
    payAmountCents: shift.paySnapshot.payAmountCents,
    tipOutRule: tipOutRuleFromSnapshot(shift.tipOutSnapshot),
  }
}

export function restaurantFromShift(shift: Shift): Restaurant {
  return {
    id: shift.restaurantId,
    name: shift.restaurantName,
    payType: shift.paySnapshot.payType,
    payAmountCents: shift.paySnapshot.payAmountCents,
    creditCardTipPayout: "same_day",
    defaultTipOutRule: { type: "none" },
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt,
  }
}

export function toUpdatedShift(
  draft: ShiftDraft,
  restaurant: Restaurant | undefined,
  existing: Shift,
  now: string,
): Shift {
  const created = toShift(draft, restaurant, now, existing)
  return {
    ...created,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: now,
  }
}

export function shiftsOnDate(shifts: Shift[], localDate: string): Shift[] {
  return shifts.filter((shift) => shift.localDate === localDate)
}

export function replaceShift(shifts: Shift[], next: Shift): Shift[] {
  return shifts.map((shift) => (shift.id === next.id ? next : shift))
}

export function removeShift(
  shifts: Shift[],
  id: string,
): { remaining: Shift[]; removed: Shift | undefined; index: number } {
  const index = shifts.findIndex((shift) => shift.id === id)
  if (index < 0) {
    return { remaining: shifts, removed: undefined, index: -1 }
  }
  return {
    remaining: shifts.filter((shift) => shift.id !== id),
    removed: shifts[index],
    index,
  }
}

export function insertShiftAt(shifts: Shift[], shift: Shift, index: number): Shift[] {
  const next = [...shifts]
  const clamped = Math.max(0, Math.min(index, next.length))
  next.splice(clamped, 0, shift)
  return next
}
