import type { PayType, Restaurant, ShiftTag, TipOutRule } from "../../domain/restaurant"
import {
  calculateHoursFromClock,
  calculateShiftIncome,
  createShift,
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
  tipOutRule?: TipOutRule
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

export function toShift(draft: ShiftDraft, restaurant: Restaurant, now: string): Shift {
  const { hours, overnight } = resolveShiftHours(draft)
  const effective = restaurantForDraft(restaurant, draft)
  const income = previewShiftIncome(draft, restaurant)
  return createShift({
    localDate: draft.localDate,
    restaurantId: restaurant.id,
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
      payType: effective.payType,
      payAmountCents: effective.payAmountCents,
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
    payType: shift.paySnapshot?.payType ?? restaurant?.payType,
    payAmountCents: shift.paySnapshot?.payAmountCents ?? restaurant?.payAmountCents,
    tipOutRule: shift.tipOutSnapshot.rule,
  }
}

export function toUpdatedShift(
  draft: ShiftDraft,
  restaurant: Restaurant,
  existing: Shift,
  now: string,
): Shift {
  const created = toShift(draft, restaurant, now)
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
