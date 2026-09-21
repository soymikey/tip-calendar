import { isRecognizedPersistedDocument, parsePersistedState } from "./migrate"
import { emptyState } from "./types"

const v2 = {
  schemaVersion: 2 as const,
  restaurants: [
    {
      id: "rst_1",
      name: "Bluebird",
      payType: "hourly" as const,
      payAmountCents: 1500,
      creditCardTipPayout: "same_day" as const,
      defaultTipOutRule: { type: "none" as const },
      createdAt: "2026-08-21T20:00:00.000Z",
      updatedAt: "2026-08-21T20:00:00.000Z",
    },
  ],
  shifts: [],
  preferences: {
    weekStartsOn: 0 as const,
    currencySymbol: "$",
    timeFormat: "12h" as const,
    defaultRestaurantId: "rst_1" as string | null,
  },
}

describe("parsePersistedState", () => {
  it("defaults analytics consent to undecided for existing installs", () => {
    const result = parsePersistedState(
      {
        schemaVersion: 2,
        restaurants: [],
        shifts: [],
        preferences: {},
      },
      "load",
    )

    expect(result.preferences.analyticsConsent).toBeNull()
  })
  it("returns schemaVersion 2 documents with preference defaults filled", () => {
    const { defaultRestaurantId: _ignored, ...preferences } = v2.preferences
    const next = parsePersistedState({ ...v2, preferences }, "load")
    expect(next).toEqual({
      ...v2,
      preferences: { ...emptyState.preferences, ...preferences, defaultRestaurantId: null },
    })
  })

  it("returns empty on unreadable load payloads", () => {
    expect(parsePersistedState({ hello: true }, "load")).toEqual(emptyState)
    expect(parsePersistedState(null, "load")).toEqual(emptyState)
  })

  it("treats version 1 documents as unreadable", () => {
    const v1 = {
      version: 1,
      restaurants: v2.restaurants,
      shifts: [],
      preferences: { weekStartsOn: 0, currencySymbol: "$", timeFormat: "12h" },
    }
    expect(parsePersistedState(v1, "load")).toEqual(emptyState)
    expect(isRecognizedPersistedDocument(v1)).toBe(false)
    expect(() => parsePersistedState(v1, "import")).toThrow(
      "This file is not a Tips Calendar backup.",
    )
  })

  it("throws on unreadable import payloads", () => {
    expect(() => parsePersistedState({ hello: true }, "import")).toThrow(
      "This file is not a Tips Calendar backup.",
    )
  })
})
