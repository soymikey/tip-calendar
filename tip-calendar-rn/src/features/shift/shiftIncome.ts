import type { Restaurant } from "../../domain/restaurant"
import type { Shift, ShiftIncome } from "../../domain/shift"
import type { Cents } from "../../domain/money"

export function displayRestaurantName(shift: Shift, restaurants: Restaurant[]): string {
  return restaurants.find((item) => item.id === shift.restaurantId)?.name ?? shift.restaurantName
}

export function incomeForShift(shift: Shift): ShiftIncome {
  return {
    ...shift.incomeSnapshot,
    tipOutSnapshot: shift.tipOutSnapshot,
  }
}

export function netIncomeCentsForShift(shift: Shift): Cents {
  return shift.incomeSnapshot.netIncomeCents
}
