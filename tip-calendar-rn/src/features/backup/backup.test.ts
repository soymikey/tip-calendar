import { createRestaurant } from "../../domain/restaurant"
import { createShift } from "../../domain/shift"
import { emptyState } from "../../storage/types"
import {
  backupSummaryLabel,
  clearedAppState,
  dataSizeLabel,
  exportCsv,
  exportJson,
  importSuccessLabel,
  parseBackupJson,
} from "./backup"

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

const salesTipOutShift = createShift({
  localDate: "2026-08-22",
  restaurantId: restaurant.id,
  restaurantName: restaurant.name,
  hours: 5,
  unpaidBreakHours: 0.5,
  cashTipsCents: 5000,
  cardTipsCents: 7500,
  otherIncomeCents: 1000,
  salesCents: 80000,
  paySnapshot: { payType: "hourly", payAmountCents: 1500 },
  tipOutSnapshot: {
    type: "sales_percent",
    baseAmountCents: 80000,
    percent: 3,
    amountCents: 2400,
  },
  now: "2026-08-22T20:00:00.000Z",
  id: "sft_2",
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

  it("exports a complete accounting row for restoring trust outside the app", () => {
    const csv = exportCsv({ ...state, shifts: [salesTipOutShift] })
    const [header, row] = csv.split("\n")

    expect(header).toBe(
      [
        "date",
        "restaurant",
        "hours",
        "effective_hours",
        "unpaid_break_minutes",
        "cash_tips",
        "card_tips",
        "total_tips",
        "other_income",
        "sales",
        "tip_out",
        "tip_out_type",
        "tip_out_base",
        "tip_out_percent",
        "wages",
        "gross_income",
        "net_income",
        "effective_hourly",
        "tag",
        "note",
        "overnight",
        "clock_in",
        "clock_out",
      ].join(","),
    )
    expect(row).toContain("4.5")
    expect(row).toContain("30")
    expect(row).toContain("125.00")
    expect(row).toContain("800.00")
    expect(row).toContain("sales_percent")
    expect(row).toContain("3")
    expect(row).toContain("24.00")
    expect(row).toContain("178.50")
    expect(row).toContain("39.67")
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

  it("rejects files that are not a Tips Calendar backup", () => {
    expect(() => parseBackupJson('{"hello":true}')).toThrow("This file is not a Tips Calendar backup.")
  })

  it("rejects backups whose restaurant and shift rows do not match the app format", () => {
    expect(() =>
      parseBackupJson(
        JSON.stringify({
          schemaVersion: 2,
          restaurants: [{ id: "rst_1" }],
          shifts: [{ id: "sft_1" }],
        }),
      ),
    ).toThrow("This file is not a Tips Calendar backup.")
  })

  it("rejects version 1 backup files", () => {
    expect(() =>
      parseBackupJson(
        JSON.stringify({
          version: 1,
          restaurants: [],
          shifts: [],
          preferences: { weekStartsOn: 0, currencySymbol: "$", timeFormat: "12h" },
        }),
      ),
    ).toThrow("This file is not a Tips Calendar backup.")
  })
})

describe("backupSummaryLabel", () => {
  it("previews the number of restaurants and shifts before replacing data", () => {
    expect(backupSummaryLabel({ ...state, shifts: [shift, salesTipOutShift] })).toBe(
      "This backup contains 1 restaurant and 2 shifts.",
    )
  })
})

describe("importSuccessLabel", () => {
  it("confirms what is now on the iPhone after import", () => {
    expect(importSuccessLabel({ ...state, shifts: [shift, salesTipOutShift] })).toBe(
      "Imported 1 restaurant and 2 shifts.",
    )
  })
})

describe("clearedAppState", () => {
  it("drops restaurants, shifts, and custom preferences", () => {
    const filled = {
      ...emptyState,
      restaurants: [restaurant],
      shifts: [shift],
      preferences: {
        weekStartsOn: 1 as const,
        currencySymbol: "€",
        timeFormat: "24h" as const,
        defaultRestaurantId: restaurant.id,
        analyticsConsent: false,
      },
    }
    expect(filled.restaurants).not.toEqual([])
    expect(clearedAppState()).toEqual(emptyState)
    expect(clearedAppState()).not.toBe(filled)
  })
})

describe("dataSizeLabel", () => {
  it("reports at least the JSON byte size", () => {
    expect(dataSizeLabel(emptyState)).toMatch(/B$/)
  })
})
