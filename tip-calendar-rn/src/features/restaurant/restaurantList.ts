import type { Restaurant } from "../../domain/restaurant"
import { formatUsd } from "../../domain/money"

export function upsertRestaurant(
  restaurants: Restaurant[],
  restaurant: Restaurant,
): Restaurant[] {
  const exists = restaurants.some((item) => item.id === restaurant.id)
  const next = exists
    ? restaurants.map((item) => (item.id === restaurant.id ? restaurant : item))
    : [...restaurants, restaurant]

  if (restaurant.isDefault) {
    return next.map((item) =>
      item.id === restaurant.id ? item : { ...item, isDefault: false },
    )
  }

  if (next.length > 0 && !next.some((item) => item.isDefault)) {
    return next.map((item, index) => ({ ...item, isDefault: index === 0 }))
  }

  return next
}

export function removeRestaurant(restaurants: Restaurant[], id: string): Restaurant[] {
  const remaining = restaurants.filter((item) => item.id !== id)
  if (remaining.length === 0 || remaining.some((item) => item.isDefault)) {
    return remaining
  }
  return remaining.map((item, index) => ({ ...item, isDefault: index === 0 }))
}

export function paySummary(restaurant: Restaurant): string {
  if (restaurant.payType === "hourly") {
    return `Hourly ${formatUsd(restaurant.payAmountCents)}/hr`
  }
  if (restaurant.payType === "fixed") {
    return `Per shift ${formatUsd(restaurant.payAmountCents)}`
  }
  return "Tips only"
}
