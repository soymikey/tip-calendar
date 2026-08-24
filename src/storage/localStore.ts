import { createDemoState } from "../fixtures/demoData";
import type { AppState, PayType } from "../domain/restaurant";
import { normalizePayAmount } from "../domain/restaurant";
import type { ShiftDraft, ShiftRecord } from "../domain/shift";
import { toShiftRecord } from "../domain/shift";

export const storageKey = "tip-calendar:v1";

function isPayType(value: unknown): value is PayType {
  return value === "hourly" || value === "fixedShift";
}

function parseAppState(value: unknown): AppState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<AppState>;
  const restaurant = candidate.restaurant;

  if (!restaurant || typeof restaurant !== "object") {
    return null;
  }

  const name = typeof restaurant.name === "string" ? restaurant.name.trim() : "";
  const payType = isPayType(restaurant.payType) ? restaurant.payType : null;
  const payAmount = Number(restaurant.payAmount);

  if (!name || !payType) {
    return null;
  }

  const shifts = Array.isArray(candidate.shifts)
    ? candidate.shifts.flatMap((shift) => parseShiftRecord(shift))
    : [];

  return {
    version: 1,
    demoSeededAt:
      typeof candidate.demoSeededAt === "string" ? candidate.demoSeededAt : new Date().toISOString(),
    restaurant: {
      id: "default",
      name,
      payType,
      payAmount: normalizePayAmount(payAmount),
    },
    shifts,
  };
}

function parseShiftRecord(value: unknown): ShiftRecord[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const candidate = value as Partial<ShiftRecord>;
  if (typeof candidate.id !== "string" || typeof candidate.date !== "string") {
    return [];
  }

  return [
    toShiftRecord({
      id: candidate.id,
      date: candidate.date,
      hours: Number(candidate.hours),
      useClock: Boolean(candidate.useClock),
      clockIn: typeof candidate.clockIn === "string" ? candidate.clockIn : "",
      clockOut: typeof candidate.clockOut === "string" ? candidate.clockOut : "",
      unpaidBreak: Number(candidate.unpaidBreak),
      cashTips: Number(candidate.cashTips),
      creditTips: Number(candidate.creditTips),
      otherIncome: Number(candidate.otherIncome),
      manualTipOut: Number(candidate.manualTipOut),
      notes: typeof candidate.notes === "string" ? candidate.notes : "",
      createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : undefined,
    }),
  ];
}

function writeState(state: AppState): AppState {
  localStorage.setItem(storageKey, JSON.stringify(state));
  return state;
}

export function loadAppState(): AppState {
  const raw = localStorage.getItem(storageKey);

  if (!raw) {
    return writeState(createDemoState());
  }

  try {
    const parsed = parseAppState(JSON.parse(raw));
    return parsed ?? writeState(createDemoState());
  } catch {
    return writeState(createDemoState());
  }
}

export function saveAppState(state: AppState): AppState {
  const parsed = parseAppState(state);
  return writeState(parsed ?? createDemoState());
}

export function resetDemoData(): AppState {
  return writeState(createDemoState());
}

export function saveShift(draft: ShiftDraft): ShiftRecord {
  const state = loadAppState();
  const record = toShiftRecord(draft);
  const exists = state.shifts.some((shift) => shift.id === record.id);
  const shifts = exists
    ? state.shifts.map((shift) => (shift.id === record.id ? record : shift))
    : [record, ...state.shifts];

  writeState({ ...state, shifts });
  return record;
}

export function deleteShift(id: string): ShiftRecord | null {
  const state = loadAppState();
  const deleted = state.shifts.find((shift) => shift.id === id);

  if (!deleted) {
    return null;
  }

  writeState({ ...state, shifts: state.shifts.filter((shift) => shift.id !== id) });
  return deleted;
}

export function restoreShift(shift: ShiftRecord): ShiftRecord {
  const state = loadAppState();

  if (state.shifts.some((existing) => existing.id === shift.id)) {
    return shift;
  }

  writeState({ ...state, shifts: [shift, ...state.shifts] });
  return shift;
}
