import type { PayType } from "./restaurant";
import type { ShiftRecord } from "./shift";
import { calculateShift } from "./shift";

export type PaySettings = {
  payType: PayType;
  payAmount: number;
};

export type DateSummary = {
  shiftCount: number;
  totalTips: number;
  wageIncome: number;
  totalIncome: number;
  netIncome: number;
  effectiveHours: number;
  averageActualHourly: number | null;
  hasCrossMidnight: boolean;
};

export type CalendarDay = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function emptySummary(): DateSummary {
  return {
    shiftCount: 0,
    totalTips: 0,
    wageIncome: 0,
    totalIncome: 0,
    netIncome: 0,
    effectiveHours: 0,
    averageActualHourly: null,
    hasCrossMidnight: false,
  };
}

function localDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function summarizeShifts(shifts: ShiftRecord[], pay: PaySettings): DateSummary {
  const summary = shifts.reduce((current, shift) => {
    const calculation = calculateShift({
      payType: pay.payType,
      payAmount: pay.payAmount,
      hours: shift.hours,
      useClock: shift.useClock,
      clockIn: shift.clockIn,
      clockOut: shift.clockOut,
      unpaidBreak: shift.unpaidBreak,
      cashTips: shift.cashTips,
      creditTips: shift.creditTips,
      otherIncome: shift.otherIncome,
      manualTipOut: shift.manualTipOut,
    });

    return {
      shiftCount: current.shiftCount + 1,
      totalTips: round(current.totalTips + calculation.totalTips),
      wageIncome: round(current.wageIncome + calculation.wageIncome),
      totalIncome: round(current.totalIncome + calculation.totalIncome),
      netIncome: round(current.netIncome + calculation.netIncome),
      effectiveHours: round(current.effectiveHours + calculation.effectiveHours),
      averageActualHourly: null,
      hasCrossMidnight: current.hasCrossMidnight || calculation.isCrossMidnight,
    };
  }, emptySummary());

  return {
    ...summary,
    averageActualHourly:
      summary.effectiveHours > 0 ? round(summary.netIncome / summary.effectiveHours) : null,
  };
}

export function summarizeShiftsByDate(shifts: ShiftRecord[], pay: PaySettings): Record<string, DateSummary> {
  const grouped = shifts.reduce<Record<string, ShiftRecord[]>>((current, shift) => {
    current[shift.date] = [...(current[shift.date] ?? []), shift];
    return current;
  }, {});

  return Object.fromEntries(
    Object.entries(grouped).map(([date, dateShifts]) => [date, summarizeShifts(dateShifts, pay)]),
  );
}

export function summarizePeriod(
  shifts: ShiftRecord[],
  pay: PaySettings,
  anchorDate: string,
  period: "week" | "month",
): DateSummary {
  const anchor = parseDate(anchorDate);
  const start =
    period === "week"
      ? addDays(anchor, -anchor.getDay())
      : new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end =
    period === "week"
      ? addDays(start, 6)
      : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);

  return summarizeShifts(
    shifts.filter((shift) => {
      const date = parseDate(shift.date);
      return date >= start && date <= end;
    }),
    pay,
  );
}

export function buildMonthDays(anchorDate: string): CalendarDay[] {
  const anchor = parseDate(anchorDate);
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = addDays(firstOfMonth, -firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return {
      date: localDate(date),
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === anchor.getMonth(),
    };
  });
}

export function shiftMonth(anchorDate: string, offset: number): string {
  const anchor = parseDate(anchorDate);
  return localDate(new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1));
}

export function formatMonth(anchorDate: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(parseDate(anchorDate));
}
