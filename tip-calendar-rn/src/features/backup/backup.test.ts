import { createRestaurant } from "../../domain/restaurant"
import { createShift } from "../../domain/shift"
import { emptyState } from "../../storage/types"
import { dataSizeLabel, exportCsv, exportJson, parseBackupJson } from "./backup"

const restaurant = createRestaurant({
  name: "Bluebird, NYC",
  now: "2026-08-21T20:00:00.000Z",
  id: "rst_1",
})

const shift = createShift({
  localDate: "2026-08-21",
  restaurantId: restaurant.id,
  restaurantName: restaurant.name,
  hours: 6.5,
  cashTipsCents: 12000,
  cardTipsCents: 8700,
  note: 'Late "rush"',
  paySnapshot: { payType: "none", payAmountCents: 0 },
  tipOutSnapshot: { type: "none", amountCents: 0 },
  now: "2026-08-21T20:00:00.000Z",
  id: "sft_1",
})

const state = {
  ...emptyState,
  restaurants: [restaurant],
  shifts: [shift],
}

describe("exportCsv", () => {
  it("quotes restaurant names and notes that contain commas", () => {
    const csv = exportCsv(state)
    expect(csv.split("\n")[0]).toContain("net_income")
    expect(csv).toContain('"Bluebird, NYC"')
    expect(csv).toContain("207.00")
    expect(csv).toContain('"Late ""rush"""')
  })

  it("uses the frozen restaurant name when the restaurant row is gone", () => {
    const csv = exportCsv({ ...state, restaurants: [] })
    expect(csv).toContain('"Bluebird, NYC"')
    expect(csv).toContain("207.00")
  })
})

describe("parseBackupJson", () => {
  it("round-trips a full backup", () => {
    const restored = parseBackupJson(exportJson(state))
    expect(restored.schemaVersion).toBe(2)
    expect(restored.restaurants).toHaveLength(1)
    expect(restored.shifts[0]?.id).toBe("sft_1")
    expect(restored.preferences.weekStartsOn).toBe(0)
  })

  it("imports a v1 JSON backup", () => {
    const restored = parseBackupJson(
      JSON.stringify({
        version: 1,
        restaurants: [
          {
            id: "rst_1",
            name: "Bluebird",
            isDefault: true,
            payType: "hourly",
            payAmountCents: 1500,
            creditCardTipPayout: "same_day",
            defaultTipOutRule: { type: "tips_percent", percent: 3 },
            createdAt: "2026-08-21T20:00:00.000Z",
            updatedAt: "2026-08-21T20:00:00.000Z",
          },
        ],
        shifts: [
          {
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
          },
        ],
        preferences: { weekStartsOn: 0, currencySymbol: "$", timeFormat: "12h" },
      }),
    )
    expect(restored.schemaVersion).toBe(2)
    expect(restored.shifts[0]?.id).toBe("sft_1")
    expect(restored.shifts[0]?.incomeSnapshot.netIncomeCents).toBe(29829)
  })

  it("rejects files that are not a Tips Calendar backup", () => {
    expect(() => parseBackupJson('{"hello":true}')).toThrow("This file is not a Tips Calendar backup.")
  })

  it("rejects a v1 file with a shift missing id", () => {
    expect(() =>
      parseBackupJson(
        JSON.stringify({
          version: 1,
          restaurants: [],
          shifts: [{ localDate: "2026-08-21", cashTipsCents: 1 }],
          preferences: { weekStartsOn: 0, currencySymbol: "$", timeFormat: "12h" },
        }),
      ),
    ).toThrow("This file is not a Tips Calendar backup.")
  })
})

describe("dataSizeLabel", () => {
  it("reports at least the JSON byte size", () => {
    expect(dataSizeLabel(emptyState)).toMatch(/B$/)
  })
})
