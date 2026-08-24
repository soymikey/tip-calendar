import type { Preferences, Restaurant } from "../domain/restaurant"
import type { Shift } from "../domain/shift"

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

export type AppState = {
  version: 1
  restaurants: Restaurant[]
  shifts: Shift[]
  preferences: Preferences
}

export const STORAGE_KEY = "tips-calendar/v1"

export const defaultPreferences: Preferences = {
  weekStartsOn: 0,
  currencySymbol: "$",
  timeFormat: "12h",
}

export const emptyState: AppState = {
  version: 1,
  restaurants: [],
  shifts: [],
  preferences: defaultPreferences,
}
