import { describe, expect, it } from "vitest";
import { demoState } from "../fixtures/demoData";
import { exportCsv, exportJsonBackup, importJsonBackup } from "./backup";

describe("backup and export", () => {
  it("exports restaurants and shifts as CSV", () => {
    const csv = exportCsv({
      ...demoState,
      shifts: [
        {
          id: "shift-1",
          date: "2026-08-24",
          restaurantId: "default",
          hours: 5,
          useClock: false,
          clockIn: "",
          clockOut: "",
          unpaidBreak: 0,
          cashTips: 40,
          creditTips: 160,
          otherIncome: 0,
          manualTipOut: 0,
          salesAmount: 0,
          tipOutRuleSnapshot: { type: "tipsPercent", percent: 10 },
          notes: "Dinner",
          createdAt: "2026-08-24T00:00:00.000Z",
          updatedAt: "2026-08-24T00:00:00.000Z",
        },
      ],
    });

    expect(csv).toContain("restaurant_name,date,total_tips,wage_income,total_income,tip_out,net_income");
    expect(csv).toContain("Sunny Table Bistro,2026-08-24,200.00,62.50,262.50,20.00,242.50");
  });

  it("exports and imports JSON only after confirmation", () => {
    const json = exportJsonBackup(demoState);

    expect(importJsonBackup(json, false)).toEqual({
      ok: false,
      message: "Confirm import before replacing local data.",
    });
    expect(importJsonBackup(json, true).ok).toBe(true);
  });

  it("returns a plain language error for malformed JSON", () => {
    expect(importJsonBackup("{bad", true)).toEqual({
      ok: false,
      message: "This backup file could not be read. Choose a valid JSON backup.",
    });
  });
});
