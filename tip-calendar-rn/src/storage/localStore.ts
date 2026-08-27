import AsyncStorage from "@react-native-async-storage/async-storage"
import { emptyState, STORAGE_KEY, type AppState, type KeyValueStore } from "./types"

export function createLocalStore(kv: KeyValueStore = AsyncStorage) {
  return {
    async load(): Promise<AppState> {
      const raw = await kv.getItem(STORAGE_KEY)
      if (!raw) {
        return emptyState
      }
      try {
        const parsed = JSON.parse(raw) as AppState
        if (parsed.version !== 1 || !Array.isArray(parsed.restaurants) || !Array.isArray(parsed.shifts)) {
          return emptyState
        }
        return {
          version: 1,
          restaurants: parsed.restaurants,
          shifts: parsed.shifts,
          preferences: { ...emptyState.preferences, ...parsed.preferences },
        }
      } catch {
        return emptyState
      }
    },
    async save(state: AppState): Promise<void> {
      await kv.setItem(STORAGE_KEY, JSON.stringify(state))
    },
  }
}
