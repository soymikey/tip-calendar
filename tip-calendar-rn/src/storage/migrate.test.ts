import { migrateToV2, parsePersistedState } from "./migrate"
import { emptyState } from "./types"

const restaurant = {
  id: "rst_1",
  name: "Bluebird",
  isDefault: true,
  payType: "hourly" as const,
  payAmountCents: 1500,
  creditCardTipPayout: "same_day" as const,
  defaultTipOutRule: { type: "tips_percent" as const, percent: 3 },
  createdAt: "2026-08-21T20:00:00.000Z",
  updatedAt: "2026-08-21T20:00:00.000Z",
}

const v1Shift = {
  id: "sft_1",
  localDate: "2026-08-21",
  restaurantId: "rst_1",
  hours: 6.5,
  unpaidBreakHours: 0,
  overnight: false,
  cashTipsCents: 8500,
  cardTipsCents: 12200,
  otherIncomeCents: 0,
  tipOutSnapshot: { rule: { type: "tips_percent", percent: 3 }, amountCents: 621 },
  paySnapshot: { payType: "hourly", payAmountCents: 1500 },
  createdAt: "2026-08-21T20:00:00.000Z",
  updatedAt: "2026-08-21T20:00:00.000Z",
}

const v1 = {
  version: 1 as const,
  restaurants: [restaurant],
  shifts: [v1Shift],
  preferences: { weekStartsOn: 0 as const, currencySymbol: "$", timeFormat: "12h" as const },
}

describe("migrateToV2", () => {
  it("moves default restaurant into preferences and freezes snapshots", () => {
    const next = migrateToV2(v1, "load")
    expect(next.schemaVersion).toBe(2)
    expect("version" in next).toBe(false)
    expect("isDefault" in next.restaurants[0]!).toBe(false)
    expect(next.preferences.defaultRestaurantId).toBe("rst_1")
    expect(next.shifts[0]?.id).toBe("sft_1")
    expect(next.shifts[0]?.restaurantName).toBe("Bluebird")
    expect(next.shifts[0]?.tipOutSnapshot).toEqual({
      type: "tips_percent",
      baseAmountCents: 20700,
      percent: 3,
      amountCents: 621,
    })
    expect(next.shifts[0]?.incomeSnapshot.netIncomeCents).toBe(29829)
    expect(next.shifts[0]?.incomeSnapshot.tipOutCents).toBe(621)
  })

  it("keeps a missing-restaurant shift and names it Unknown restaurant", () => {
    const next = migrateToV2({ ...v1, restaurants: [] }, "load")
    expect(next.shifts[0]?.restaurantName).toBe("Unknown restaurant")
    expect(next.shifts[0]?.incomeSnapshot.netIncomeCents).toBeGreaterThan(0)
    expect(next.preferences.defaultRestaurantId).toBeNull()
  })

  it("drops shifts without id or localDate on load", () => {
    const next = migrateToV2(
      { ...v1, shifts: [{ cashTipsCents: 1 }, v1Shift] },
      "load",
    )
    expect(next.shifts).toHaveLength(1)
    expect(next.shifts[0]?.id).toBe("sft_1")
  })

  it("rejects import when any shift lacks id or localDate", () => {
    expect(() =>
      migrateToV2({ ...v1, shifts: [{ cashTipsCents: 1 }, v1Shift] }, "import"),
    ).toThrow("This file is not a Tips Calendar backup.")
  })

  it("keeps a v1 fixed tip-out rule as fixed, not manual", () => {
    const next = migrateToV2(
      {
        ...v1,
        shifts: [
          {
            ...v1Shift,
            tipOutSnapshot: { rule: { type: "fixed", amountCents: 250 }, amountCents: 250 },
          },
        ],
      },
      "load",
    )
    expect(next.shifts[0]?.tipOutSnapshot).toEqual({ type: "fixed", amountCents: 250 })
  })
})

describe("parsePersistedState", () => {
  it("returns v2 documents unchanged", () => {
    const v2 = migrateToV2(v1, "load")
    expect(parsePersistedState(v2, "load")).toEqual(v2)
  })

  it("returns empty on unreadable load payloads", () => {
    expect(parsePersistedState({ hello: true }, "load")).toEqual(emptyState)
    expect(parsePersistedState(null, "load")).toEqual(emptyState)
  })

  it("throws on unreadable import payloads", () => {
    expect(() => parsePersistedState({ hello: true }, "import")).toThrow(
      "This file is not a Tips Calendar backup.",
    )
  })
})
