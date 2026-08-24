import { beforeEach, describe, expect, it } from "vitest";
import { demoState } from "../fixtures/demoData";
import {
  loadAppState,
  resetDemoData,
  saveAppState,
  saveShift,
  deleteShift,
  restoreShift,
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

  it("migrates milestone one data by adding an empty shifts list", () => {
    localStorage.setItem(storageKey, JSON.stringify({ ...demoState, shifts: undefined }));

    expect(loadAppState().shifts).toEqual([]);
  });

  it("creates, edits, deletes, and restores shifts in local storage", () => {
    const created = saveShift({
      date: "2026-08-24",
      hours: 5,
      unpaidBreak: 0,
      cashTips: 30,
      creditTips: 120,
      otherIncome: 0,
      manualTipOut: 15,
      notes: "",
    });

    expect(loadAppState().shifts).toHaveLength(1);

    const edited = saveShift({ ...created, cashTips: 45 });
    expect(loadAppState().shifts[0]).toMatchObject({ id: edited.id, cashTips: 45 });

    const deleted = deleteShift(edited.id);
    expect(deleted?.id).toBe(edited.id);
    expect(loadAppState().shifts).toEqual([]);

    restoreShift(deleted!);
    expect(loadAppState().shifts[0].id).toBe(edited.id);
  });
});
