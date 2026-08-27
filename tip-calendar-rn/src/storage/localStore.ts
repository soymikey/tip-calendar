import AsyncStorage from "@react-native-async-storage/async-storage"
import { parsePersistedState } from "./migrate"
import { emptyState, STORAGE_KEY, type AppState, type KeyValueStore } from "./types"

export function createLocalStore(kv: KeyValueStore = AsyncStorage) {
  return {
    async load(): Promise<AppState> {
      const raw = await kv.getItem(STORAGE_KEY)
      if (!raw) {
        return emptyState
      }
      try {
        const next = parsePersistedState(JSON.parse(raw), "load")
        if (next.schemaVersion === 2) {
          await kv.setItem(STORAGE_KEY, JSON.stringify(next))
        }
        return next
      } catch {
        return emptyState
      }
    },
    async save(state: AppState): Promise<void> {
      await kv.setItem(STORAGE_KEY, JSON.stringify(state))
    },
  }
}
