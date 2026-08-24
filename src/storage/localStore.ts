import { createDemoState } from "../fixtures/demoData";
import type { AppState, CreditTipPayout, PayType, RestaurantSettings } from "../domain/restaurant";
import { normalizePayAmount, normalizeTipOutRule } from "../domain/restaurant";
import type { ShiftDraft, ShiftRecord } from "../domain/shift";
import { toShiftRecord } from "../domain/shift";

export const storageKey = "tip-calendar:v1";

function isPayType(value: unknown): value is PayType {
  return value === "hourly" || value === "fixedShift";
}

function isCreditTipPayout(value: unknown): value is CreditTipPayout {
  return value === "sameDay" || value === "paycheck";
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

  const legacyRestaurant = parseRestaurant({
    ...restaurant,
    id: typeof restaurant.id === "string" ? restaurant.id : "default",
  });
  if (!legacyRestaurant) {
    return null;
  }
  const parsedRestaurants = Array.isArray(candidate.restaurants)
    ? candidate.restaurants.flatMap((item) => {
        const parsed = parseRestaurant(item);
        return parsed ? [parsed] : [];
      })
    : [legacyRestaurant];
  const restaurants = parsedRestaurants.map((item) =>
    item.id === legacyRestaurant.id ? legacyRestaurant : item,
  );
  const defaultRestaurantId =
    typeof candidate.defaultRestaurantId === "string" &&
    restaurants.some((item) => item.id === candidate.defaultRestaurantId)
      ? candidate.defaultRestaurantId
      : restaurants[0].id;

  const shifts = Array.isArray(candidate.shifts)
    ? candidate.shifts.flatMap((shift) => parseShiftRecord(shift))
    : [];

  return {
    version: 1,
    demoSeededAt:
      typeof candidate.demoSeededAt === "string" ? candidate.demoSeededAt : new Date().toISOString(),
    restaurant: restaurants.find((item) => item.id === defaultRestaurantId) ?? legacyRestaurant,
    defaultRestaurantId,
    restaurants,
    shifts,
  };
}

function parseRestaurant(value: unknown): RestaurantSettings | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<RestaurantSettings>;
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const payType = isPayType(candidate.payType) ? candidate.payType : null;

  if (!name || !payType) {
    return null;
  }

  return {
    id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
    name,
    payType,
    payAmount: normalizePayAmount(Number(candidate.payAmount)),
    creditTipPayout: isCreditTipPayout(candidate.creditTipPayout) ? candidate.creditTipPayout : "sameDay",
    defaultTipOut: normalizeTipOutRule(candidate.defaultTipOut),
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
      restaurantId: typeof candidate.restaurantId === "string" ? candidate.restaurantId : "default",
      hours: Number(candidate.hours),
      useClock: Boolean(candidate.useClock),
      clockIn: typeof candidate.clockIn === "string" ? candidate.clockIn : "",
      clockOut: typeof candidate.clockOut === "string" ? candidate.clockOut : "",
      unpaidBreak: Number(candidate.unpaidBreak),
      cashTips: Number(candidate.cashTips),
      creditTips: Number(candidate.creditTips),
      otherIncome: Number(candidate.otherIncome),
      manualTipOut: Number(candidate.manualTipOut),
      salesAmount: Number(candidate.salesAmount),
      tipOutRuleSnapshot: normalizeTipOutRule(candidate.tipOutRuleSnapshot),
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
  if (!parsed) {
    return writeState(createDemoState());
  }

  const defaultRestaurant = parsed.restaurants.find((restaurant) => restaurant.id === parsed.defaultRestaurantId);
  return writeState({
    ...parsed,
    restaurant: defaultRestaurant ?? parsed.restaurant,
  });
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

export type RestaurantDraft = Omit<RestaurantSettings, "id"> & { id?: string };

export function saveRestaurant(draft: RestaurantDraft): RestaurantSettings {
  const state = loadAppState();
  const restaurant: RestaurantSettings = {
    id: draft.id || crypto.randomUUID(),
    name: draft.name.trim() || "New Restaurant",
    payType: draft.payType,
    payAmount: normalizePayAmount(Number(draft.payAmount)),
    creditTipPayout: draft.creditTipPayout,
    defaultTipOut: normalizeTipOutRule(draft.defaultTipOut),
  };
  const exists = state.restaurants.some((item) => item.id === restaurant.id);
  const restaurants = exists
    ? state.restaurants.map((item) => (item.id === restaurant.id ? restaurant : item))
    : [...state.restaurants, restaurant];
  const defaultRestaurantId = exists ? state.defaultRestaurantId : restaurant.id;
  const defaultRestaurant = restaurants.find((item) => item.id === defaultRestaurantId) ?? restaurant;

  writeState({ ...state, restaurants, defaultRestaurantId, restaurant: defaultRestaurant });
  return restaurant;
}

export function setDefaultRestaurant(id: string): boolean {
  const state = loadAppState();
  const restaurant = state.restaurants.find((item) => item.id === id);
  if (!restaurant) {
    return false;
  }

  writeState({ ...state, defaultRestaurantId: id, restaurant });
  return true;
}

export function deleteRestaurant(id: string): boolean {
  const state = loadAppState();
  if (state.restaurants.length <= 1) {
    return false;
  }

  const restaurants = state.restaurants.filter((restaurant) => restaurant.id !== id);
  if (restaurants.length === state.restaurants.length) {
    return false;
  }
  const defaultRestaurantId =
    state.defaultRestaurantId === id ? restaurants[0].id : state.defaultRestaurantId;
  const restaurant = restaurants.find((item) => item.id === defaultRestaurantId) ?? restaurants[0];

  writeState({ ...state, restaurants, defaultRestaurantId, restaurant });
  return true;
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
