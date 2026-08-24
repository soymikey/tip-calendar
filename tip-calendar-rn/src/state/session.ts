import type { AppState } from "../storage/types"

export function needsOnboarding(state: AppState): boolean {
  return state.restaurants.length === 0
}
