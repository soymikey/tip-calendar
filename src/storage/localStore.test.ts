import { beforeEach, describe, expect, it } from "vitest";
import { demoState } from "../fixtures/demoData";
import {
  loadAppState,
  resetDemoData,
  saveAppState,
  storageKey,
} from "./localStore";

describe("local app storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads demo data on first visit and persists it", () => {
    const state = loadAppState();

    expect(state.restaurant.name).toBe(demoState.restaurant.name);
    expect(localStorage.getItem(storageKey)).toContain(demoState.restaurant.name);
  });

  it("reads back edited restaurant settings after saving", () => {
    const edited = {
      ...demoState,
      restaurant: {
        ...demoState.restaurant,
        name: "Blue Plate Diner",
        payType: "fixedShift" as const,
        payAmount: 95,
      },
    };

    saveAppState(edited);

    expect(loadAppState().restaurant).toEqual(edited.restaurant);
  });

  it("restores seeded demo data when reset is requested", () => {
    saveAppState({
      ...demoState,
      restaurant: { ...demoState.restaurant, name: "Changed" },
    });

    expect(resetDemoData().restaurant.name).toBe(demoState.restaurant.name);
    expect(loadAppState().restaurant.name).toBe(demoState.restaurant.name);
  });

  it("recovers from malformed stored data", () => {
    localStorage.setItem(storageKey, "not-json");

    expect(loadAppState().restaurant.name).toBe(demoState.restaurant.name);
  });
});
