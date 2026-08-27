import type { Restaurant } from "../domain/restaurant"
import type { Shift } from "../domain/shift"
import { emptyState, type AppState } from "./types"

export type PersistMode = "load" | "import"

const BACKUP_ERROR = "This file is not a Tips Calendar backup."

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isRecognizedPersistedDocument(value: unknown): value is Record<string, unknown> & {
  restaurants: unknown[]
  shifts: unknown[]
} {
  return (
    isRecord(value) &&
    value.schemaVersion === 2 &&
    Array.isArray(value.restaurants) &&
    Array.isArray(value.shifts)
  )
}

export function parsePersistedState(value: unknown, mode: PersistMode): AppState {
  if (!isRecognizedPersistedDocument(value)) {
    if (mode === "load") {
      return emptyState
    }
    throw new Error(BACKUP_ERROR)
  }

  return {
    schemaVersion: 2,
    restaurants: value.restaurants as Restaurant[],
    shifts: value.shifts as Shift[],
    preferences: {
      ...emptyState.preferences,
      ...(isRecord(value.preferences) ? value.preferences : {}),
    },
  }
}
