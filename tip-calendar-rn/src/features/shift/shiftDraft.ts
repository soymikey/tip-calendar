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
