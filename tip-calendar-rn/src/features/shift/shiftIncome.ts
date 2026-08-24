import type { Restaurant } from "../../domain/restaurant"
import { calculateShiftIncome, type Shift, type ShiftIncome } from "../../domain/shift"
import type { Cents } from "../../domain/money"

export function restaurantForShiftPay(shift: Shift, restaurant: Restaurant): Restaurant {
  if (!shift.paySnapshot) {
    return restaurant
  }
  return {
    ...restaurant,
    payType: shift.paySnapshot.payType,
    payAmountCents: shift.paySnapshot.payAmountCents,
  }
}

export function incomeForShift(shift: Shift, restaurant: Restaurant): ShiftIncome {
  return calculateShiftIncome({
    restaurant: restaurantForShiftPay(shift, restaurant),
    hours: shift.hours,
    unpaidBreakHours: shift.unpaidBreakHours,
    cashTipsCents: shift.cashTipsCents,
    cardTipsCents: shift.cardTipsCents,
    otherIncomeCents: shift.otherIncomeCents,
    salesCents: shift.salesCents,
    tipOutOverride: shift.tipOutSnapshot.rule,
  })
}

export function netIncomeCentsForShift(shift: Shift, restaurants: Restaurant[]): Cents {
  const restaurant = restaurants.find((item) => item.id === shift.restaurantId)
  if (!restaurant) {
    return 0
  }
  return incomeForShift(shift, restaurant).netIncomeCents
}
