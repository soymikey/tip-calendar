import type { Restaurant } from "../../domain/restaurant"
import { calculateShiftIncome, createShift, type Shift, type ShiftIncome } from "../../domain/shift"

export type ShiftDraft = {
  localDate: string
  restaurantId: string
  hours: number
  cashTipsCents: number
  cardTipsCents: number
}

export function canSaveShift(draft: ShiftDraft): boolean {
  return draft.hours > 0
}

export function previewShiftIncome(draft: ShiftDraft, restaurant: Restaurant): ShiftIncome {
  return calculateShiftIncome({
    restaurant,
    hours: draft.hours,
    cashTipsCents: draft.cashTipsCents,
    cardTipsCents: draft.cardTipsCents,
  })
}

export function toShift(draft: ShiftDraft, restaurant: Restaurant, now: string): Shift {
  const income = previewShiftIncome(draft, restaurant)
  return createShift({
    localDate: draft.localDate,
    restaurantId: restaurant.id,
    hours: draft.hours,
    cashTipsCents: draft.cashTipsCents,
    cardTipsCents: draft.cardTipsCents,
    tipOutSnapshot: income.tipOutSnapshot,
    now,
  })
}

export function fromShift(shift: Shift): ShiftDraft {
  return {
    localDate: shift.localDate,
    restaurantId: shift.restaurantId,
    hours: shift.hours,
    cashTipsCents: shift.cashTipsCents,
    cardTipsCents: shift.cardTipsCents,
  }
}

export function toUpdatedShift(
  draft: ShiftDraft,
  restaurant: Restaurant,
  existing: Shift,
  now: string,
): Shift {
  const income = calculateShiftIncome({
    restaurant,
    hours: draft.hours,
    unpaidBreakHours: existing.unpaidBreakHours,
    cashTipsCents: draft.cashTipsCents,
    cardTipsCents: draft.cardTipsCents,
    otherIncomeCents: existing.otherIncomeCents,
    salesCents: existing.salesCents,
    tipOutOverride: existing.tipOutSnapshot.rule,
  })
  return {
    ...existing,
    hours: draft.hours,
    cashTipsCents: draft.cashTipsCents,
    cardTipsCents: draft.cardTipsCents,
    tipOutSnapshot: income.tipOutSnapshot,
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
