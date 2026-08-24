import { createDemoState } from "../fixtures/demoData";
import type { AppState, PayType } from "../domain/restaurant";
import { normalizePayAmount } from "../domain/restaurant";

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
  };
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
