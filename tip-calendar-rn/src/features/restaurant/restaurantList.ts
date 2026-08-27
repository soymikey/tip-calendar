import type { Restaurant } from "../../domain/restaurant"
import { formatUsd } from "../../domain/money"

export function upsertRestaurant(
  restaurants: Restaurant[],
  restaurant: Restaurant,
): Restaurant[] {
  const exists = restaurants.some((item) => item.id === restaurant.id)
  return exists
    ? restaurants.map((item) => (item.id === restaurant.id ? restaurant : item))
    : [...restaurants, restaurant]
}

export function removeRestaurant(restaurants: Restaurant[], id: string): Restaurant[] {
  return restaurants.filter((item) => item.id !== id)
}

export function nextDefaultRestaurantId(
  restaurants: Restaurant[],
  currentId: string | null,
): string | null {
  if (currentId && restaurants.some((item) => item.id === currentId)) {
    return currentId
  }
  return restaurants[0]?.id ?? null
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
