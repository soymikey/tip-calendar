import type { Restaurant } from "../../domain/restaurant"
import type { Shift, TipOutSnapshot } from "../../domain/shift"
import { parsePersistedState } from "../../storage/migrate"
import { defaultPreferences, type AppState } from "../../storage/types"
import { displayRestaurantName, incomeForShift } from "../shift/shiftIncome"

function csvCell(value: string | number): string {
  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

export function exportCsv(state: AppState): string {
  const header = [
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
  ]
  const rows = state.shifts.map((shift) => rowForShift(shift, state.restaurants))
  return [header.join(","), ...rows].join("\n")
}

function rowForShift(shift: Shift, restaurants: Restaurant[]): string {
  const name = displayRestaurantName(shift, restaurants)
  const income = incomeForShift(shift)
  const tipOut = tipOutExportParts(shift.tipOutSnapshot)
  return [
    csvCell(shift.localDate),
    csvCell(name),
    csvCell(shift.hours),
    csvCell(income.effectiveHours),
    csvCell(Math.round(shift.unpaidBreakHours * 60)),
    csvCell((shift.cashTipsCents / 100).toFixed(2)),
    csvCell((shift.cardTipsCents / 100).toFixed(2)),
    csvCell((income.totalTipsCents / 100).toFixed(2)),
    csvCell((shift.otherIncomeCents / 100).toFixed(2)),
    csvCell(shift.salesCents === undefined ? "" : (shift.salesCents / 100).toFixed(2)),
    csvCell((income.tipOutCents / 100).toFixed(2)),
    csvCell(tipOut.type),
    csvCell(tipOut.base),
    csvCell(tipOut.percent),
    csvCell((income.wageIncomeCents / 100).toFixed(2)),
    csvCell((income.grossIncomeCents / 100).toFixed(2)),
    csvCell((income.netIncomeCents / 100).toFixed(2)),
    csvCell(income.effectiveHourlyCents === null ? "" : (income.effectiveHourlyCents / 100).toFixed(2)),
    csvCell(shift.tag ?? ""),
    csvCell(shift.note ?? ""),
    csvCell(shift.overnight ? "yes" : "no"),
    csvCell(shift.clockIn ?? ""),
    csvCell(shift.clockOut ?? ""),
  ].join(",")
}

function tipOutExportParts(snapshot: TipOutSnapshot): {
  type: string
  base: string
  percent: string
} {
  if (snapshot.type === "sales_percent" || snapshot.type === "tips_percent") {
    return {
      type: snapshot.type,
      base: (snapshot.baseAmountCents / 100).toFixed(2),
      percent: String(snapshot.percent),
    }
  }
  return { type: snapshot.type, base: "", percent: "" }
}

export function exportJson(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

export function clearedAppState(): AppState {
  return {
    schemaVersion: 2,
    restaurants: [],
    shifts: [],
    preferences: { ...defaultPreferences },
  }
}

export function parseBackupJson(raw: string): AppState {
  try {
    return parsePersistedState(JSON.parse(raw), "import")
  } catch (error) {
    if (error instanceof Error && error.message === "This file is not a Tips Calendar backup.") {
      throw error
    }
    throw new Error("This file is not a Tips Calendar backup.")
  }
}

function restaurantAndShiftCounts(state: AppState): string {
  const restaurantLabel = state.restaurants.length === 1 ? "restaurant" : "restaurants"
  const shiftLabel = state.shifts.length === 1 ? "shift" : "shifts"
  return `${state.restaurants.length} ${restaurantLabel} and ${state.shifts.length} ${shiftLabel}`
}

export function backupSummaryLabel(state: AppState): string {
  return `This backup contains ${restaurantAndShiftCounts(state)}.`
}

export function importSuccessLabel(state: AppState): string {
  return `Imported ${restaurantAndShiftCounts(state)}.`
}

export function dataSizeLabel(state: AppState): string {
  const bytes = new TextEncoder().encode(exportJson(state)).length
  if (bytes < 1024) {
    return `${bytes} B`
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
