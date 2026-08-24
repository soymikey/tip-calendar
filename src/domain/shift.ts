import type { PayType, TipOutRule } from "./restaurant";

export type ShiftRecord = {
  id: string;
  date: string;
  restaurantId: string;
  hours: number;
  useClock?: boolean;
  clockIn?: string;
  clockOut?: string;
  unpaidBreak: number;
  cashTips: number;
  creditTips: number;
  otherIncome: number;
  manualTipOut: number;
  salesAmount: number;
  tipOutRuleSnapshot: TipOutRule;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ShiftInput = {
  payType: PayType;
  payAmount: number;
  hours: number;
  useClock?: boolean;
  clockIn?: string;
  clockOut?: string;
  unpaidBreak: number;
  cashTips: number;
  creditTips: number;
  otherIncome: number;
  manualTipOut: number;
  salesAmount?: number;
  tipOutRule?: TipOutRule;
};

export type ShiftDraft = Omit<ShiftRecord, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ShiftCalculation = {
  rawHours: number;
  effectiveHours: number;
  totalTips: number;
  wageIncome: number;
  totalIncome: number;
  netIncome: number;
  actualHourly: number | null;
  isCrossMidnight: boolean;
  tipOut: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return roundMoney(value);
}

function minutesFromTime(value?: string): number | null {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export function calculateClockHours(clockIn?: string, clockOut?: string) {
  const start = minutesFromTime(clockIn);
  const end = minutesFromTime(clockOut);

  if (start === null || end === null) {
    return { rawHours: 0, isCrossMidnight: false };
  }

  const isCrossMidnight = end < start;
  const adjustedEnd = isCrossMidnight ? end + 24 * 60 : end;

  return {
    rawHours: roundMoney((adjustedEnd - start) / 60),
    isCrossMidnight,
  };
}

export function calculateShift(input: ShiftInput): ShiftCalculation {
  const clock = input.useClock || input.clockIn || input.clockOut
    ? calculateClockHours(input.clockIn, input.clockOut)
    : { rawHours: normalizeNumber(input.hours), isCrossMidnight: false };
  const effectiveHours = Math.max(0, roundMoney(clock.rawHours - Math.max(0, input.unpaidBreak)));
  const totalTips = roundMoney(input.cashTips + input.creditTips);
  const wageIncome =
    input.payType === "hourly" ? roundMoney(input.payAmount * effectiveHours) : roundMoney(input.payAmount);
  const totalIncome = roundMoney(totalTips + wageIncome + input.otherIncome);
  const tipOut = calculateTipOut(input.tipOutRule, totalTips, input.salesAmount ?? 0, input.manualTipOut);
  const netIncome = roundMoney(totalIncome - tipOut);

  return {
    rawHours: clock.rawHours,
    effectiveHours,
    totalTips,
    wageIncome,
    totalIncome,
    netIncome,
    actualHourly: effectiveHours > 0 ? roundMoney(netIncome / effectiveHours) : null,
    isCrossMidnight: clock.isCrossMidnight,
    tipOut,
  };
}

export function calculateTipOut(
  rule: TipOutRule | undefined,
  totalTips: number,
  salesAmount: number,
  manualTipOut: number,
): number {
  if (manualTipOut > 0) {
    return roundMoney(manualTipOut);
  }

  if (!rule || rule.type === "none") {
    return 0;
  }

  if (rule.type === "fixed") {
    return roundMoney(rule.amount);
  }

  if (rule.type === "salesPercent") {
    return roundMoney(salesAmount * (rule.percent / 100));
  }

  return roundMoney(totalTips * (rule.percent / 100));
}

export function validateShiftInput(input: ShiftInput): string[] {
  const calculation = calculateShift(input);
  const errors: string[] = [];
  const amounts = [
    input.hours,
    input.unpaidBreak,
    input.cashTips,
    input.creditTips,
    input.otherIncome,
    input.manualTipOut,
  ];

  if (calculation.effectiveHours <= 0) {
    errors.push("Enter work hours greater than 0.");
  }

  if (amounts.some((amount) => Number.isFinite(amount) && amount < 0)) {
    errors.push("Amounts cannot be negative.");
  }

  if (input.unpaidBreak >= calculation.rawHours && calculation.rawHours > 0) {
    errors.push("Unpaid break must be shorter than work hours.");
  }

  if (calculation.tipOut > calculation.totalIncome) {
    errors.push("Tip-out cannot be higher than total income.");
  }

  return errors;
}

export function createEmptyShiftDraft(date = new Date().toLocaleDateString("en-CA")): ShiftDraft {
  return {
    date,
    restaurantId: "default",
    hours: 0,
    useClock: false,
    clockIn: "",
    clockOut: "",
    unpaidBreak: 0,
    cashTips: 0,
    creditTips: 0,
    otherIncome: 0,
    manualTipOut: 0,
    salesAmount: 0,
    tipOutRuleSnapshot: { type: "none" },
    notes: "",
  };
}

export function toShiftRecord(draft: ShiftDraft): ShiftRecord {
  const now = new Date().toISOString();

  return {
    id: draft.id ?? crypto.randomUUID(),
    date: draft.date,
    restaurantId: draft.restaurantId || "default",
    hours: normalizeNumber(draft.hours),
    useClock: Boolean(draft.useClock),
    clockIn: draft.clockIn,
    clockOut: draft.clockOut,
    unpaidBreak: normalizeNumber(draft.unpaidBreak),
    cashTips: normalizeNumber(draft.cashTips),
    creditTips: normalizeNumber(draft.creditTips),
    otherIncome: normalizeNumber(draft.otherIncome),
    manualTipOut: normalizeNumber(draft.manualTipOut),
    salesAmount: normalizeNumber(draft.salesAmount),
    tipOutRuleSnapshot: draft.tipOutRuleSnapshot,
    notes: draft.notes.trim(),
    createdAt: draft.createdAt ?? now,
    updatedAt: now,
  };
}

export function money(value: number): string {
  return `$${roundMoney(value).toFixed(2)}`;
}
