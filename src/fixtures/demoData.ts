import type { AppState } from "../domain/restaurant";

export const demoState: AppState = {
  version: 1,
  demoSeededAt: "2026-08-24T00:00:00.000Z",
  restaurant: {
    id: "default",
    name: "Sunny Table Bistro",
    payType: "hourly",
    payAmount: 12.5,
  },
};

export function createDemoState(): AppState {
  return structuredClone(demoState);
}
