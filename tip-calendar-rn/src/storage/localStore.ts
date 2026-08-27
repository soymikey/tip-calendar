import AsyncStorage from "@react-native-async-storage/async-storage"
import { isRecognizedPersistedDocument, parsePersistedState } from "./migrate"
import { emptyState, STORAGE_KEY, type AppState, type KeyValueStore } from "./types"

export function createLocalStore(kv: KeyValueStore = AsyncStorage) {
  return {
    async load(): Promise<AppState> {
      const raw = await kv.getItem(STORAGE_KEY)
      if (!raw) {
        return emptyState
      }
      try {
        const parsed = JSON.parse(raw) as unknown
        const next = parsePersistedState(parsed, "load")
        if (isRecognizedPersistedDocument(parsed)) {
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
