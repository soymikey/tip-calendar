import type { AppState, RestaurantSettings } from "../domain/restaurant";
import { tipOutRuleLabel } from "../domain/restaurant";
import { calculateShift } from "../domain/shift";

export type ImportResult = {
  ok: boolean;
  message: string;
  state?: AppState;
};

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function restaurantFor(state: AppState, id: string): RestaurantSettings {
  return state.restaurants.find((restaurant) => restaurant.id === id) ?? state.restaurant;
}

export function exportCsv(state: AppState): string {
  const header = [
    "restaurant_name",
    "date",
    "total_tips",
    "wage_income",
    "total_income",
    "tip_out",
    "net_income",
    "actual_hourly",
    "effective_hours",
    "cash_tips",
    "credit_tips",
    "other_income",
    "sales_amount",
    "tip_out_rule",
    "notes",
  ];

  const rows = state.shifts.map((shift) => {
    const restaurant = restaurantFor(state, shift.restaurantId);
    const calculation = calculateShift({
      payType: restaurant.payType,
      payAmount: restaurant.payAmount,
      hours: shift.hours,
      useClock: shift.useClock,
      clockIn: shift.clockIn,
      clockOut: shift.clockOut,
      unpaidBreak: shift.unpaidBreak,
      cashTips: shift.cashTips,
      creditTips: shift.creditTips,
      otherIncome: shift.otherIncome,
      manualTipOut: shift.manualTipOut,
      salesAmount: shift.salesAmount,
      tipOutRule: shift.tipOutRuleSnapshot,
    });

    return [
      restaurant.name,
      shift.date,
      calculation.totalTips.toFixed(2),
      calculation.wageIncome.toFixed(2),
      calculation.totalIncome.toFixed(2),
      calculation.tipOut.toFixed(2),
      calculation.netIncome.toFixed(2),
      calculation.actualHourly === null ? "" : calculation.actualHourly.toFixed(2),
      calculation.effectiveHours,
      shift.cashTips.toFixed(2),
      shift.creditTips.toFixed(2),
      shift.otherIncome.toFixed(2),
      shift.salesAmount.toFixed(2),
      tipOutRuleLabel(shift.tipOutRuleSnapshot),
      shift.notes,
    ].map(csvCell).join(",");
  });

  return [header.join(","), ...rows].join("\n");
}

export function exportJsonBackup(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AppState>;
  return Array.isArray(candidate.restaurants) && Array.isArray(candidate.shifts) && Boolean(candidate.restaurant);
}

export function importJsonBackup(raw: string, confirmed: boolean): ImportResult {
  if (!confirmed) {
    return { ok: false, message: "Confirm import before replacing local data." };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isAppState(parsed)) {
      return {
        ok: false,
        message: "This backup file could not be read. Choose a valid JSON backup.",
      };
    }

    return { ok: true, message: "JSON backup imported.", state: parsed };
  } catch {
    return {
      ok: false,
      message: "This backup file could not be read. Choose a valid JSON backup.",
    };
  }
}
