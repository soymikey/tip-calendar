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
  hours: 6.5,
  cashTipsCents: 12000,
  cardTipsCents: 8700,
  note: 'Late "rush"',
  tipOutSnapshot: { rule: { type: "none" }, amountCents: 0 },
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
})

describe("parseBackupJson", () => {
  it("round-trips a full backup", () => {
    const restored = parseBackupJson(exportJson(state))
    expect(restored.restaurants).toHaveLength(1)
    expect(restored.shifts[0]?.id).toBe("sft_1")
    expect(restored.preferences.weekStartsOn).toBe(0)
  })

  it("rejects files that are not a Tips Calendar backup", () => {
    expect(() => parseBackupJson('{"hello":true}')).toThrow("This file is not a Tips Calendar backup.")
  })
})

describe("dataSizeLabel", () => {
  it("reports at least the JSON byte size", () => {
    expect(dataSizeLabel(emptyState)).toMatch(/B$/)
  })
})
