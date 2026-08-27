import type { Restaurant } from "../../domain/restaurant"
import type { Shift } from "../../domain/shift"
import { emptyState, type AppState } from "../../storage/types"
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
    "cash_tips",
    "card_tips",
    "other_income",
    "tip_out",
    "wages",
    "net_income",
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
  return [
    csvCell(shift.localDate),
    csvCell(name),
    csvCell(shift.hours),
    csvCell((shift.cashTipsCents / 100).toFixed(2)),
    csvCell((shift.cardTipsCents / 100).toFixed(2)),
    csvCell((shift.otherIncomeCents / 100).toFixed(2)),
    csvCell((income.tipOutCents / 100).toFixed(2)),
    csvCell((income.wageIncomeCents / 100).toFixed(2)),
    csvCell((income.netIncomeCents / 100).toFixed(2)),
    csvCell(shift.tag ?? ""),
    csvCell(shift.note ?? ""),
    csvCell(shift.overnight ? "yes" : "no"),
    csvCell(shift.clockIn ?? ""),
    csvCell(shift.clockOut ?? ""),
  ].join(",")
}

export function exportJson(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

export function parseBackupJson(raw: string): AppState {
  const parsed = JSON.parse(raw) as AppState
  if (parsed.version !== 1 || !Array.isArray(parsed.restaurants) || !Array.isArray(parsed.shifts)) {
    throw new Error("This file is not a Tips Calendar backup.")
  }
  return {
    version: 1,
    restaurants: parsed.restaurants,
    shifts: parsed.shifts,
    preferences: { ...emptyState.preferences, ...parsed.preferences },
  }
}

export function dataSizeLabel(state: AppState): string {
  const bytes = new TextEncoder().encode(exportJson(state)).length
  if (bytes < 1024) {
    return `${bytes} B`
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
