import type { KeyValueStore } from "./types"

export function createMemoryStore(seed: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(seed))
  return {
    async getItem(key) {
      return data.get(key) ?? null
    },
    async setItem(key, value) {
      data.set(key, value)
    },
    async removeItem(key) {
      data.delete(key)
    },
  }
}
