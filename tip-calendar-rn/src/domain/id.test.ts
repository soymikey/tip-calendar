import { newEntityId } from "./id"

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe("newEntityId", () => {
  it("returns a UUID when global crypto.randomUUID is missing", () => {
    const original = globalThis.crypto
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {},
    })
    try {
      expect(newEntityId()).toMatch(UUID)
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: original,
      })
    }
  })
})
