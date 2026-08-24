import { describe, expect, it } from "vitest";
import type { ShiftRecord } from "./shift";
import { buildMonthDays, summarizePeriod, summarizeShiftsByDate } from "./calendar";

const baseShift: ShiftRecord = {
  id: "shift-1",
  date: "2026-08-23",
  hours: 4,
  useClock: false,
  clockIn: "",
  clockOut: "",
  unpaidBreak: 0,
  cashTips: 20,
  creditTips: 80,
  otherIncome: 0,
  manualTipOut: 10,
  notes: "",
  createdAt: "2026-08-23T01:00:00.000Z",
  updatedAt: "2026-08-23T01:00:00.000Z",
};

describe("calendar summaries", () => {
  it("groups multiple shifts by local saved date and totals net income", () => {
    const summaries = summarizeShiftsByDate(
      [
        baseShift,
        { ...baseShift, id: "shift-2", cashTips: 40, creditTips: 100 },
        {
          ...baseShift,
          id: "shift-3",
          date: "2026-08-24",
          useClock: true,
          clockIn: "22:00",
          clockOut: "02:00",
        },
      ],
      { payType: "hourly", payAmount: 12.5 },
    );

    expect(summaries["2026-08-23"]).toMatchObject({
      shiftCount: 2,
      totalTips: 240,
      netIncome: 320,
      effectiveHours: 8,
    });
    expect(summaries["2026-08-24"].hasCrossMidnight).toBe(true);
  });

  it("summarizes week and month totals with weighted average actual hourly", () => {
    const summary = summarizePeriod(
      [
        baseShift,
        { ...baseShift, id: "shift-2", date: "2026-08-25", hours: 6, cashTips: 50, creditTips: 100 },
      ],
      { payType: "hourly", payAmount: 10 },
      "2026-08-23",
      "week",
    );

    expect(summary).toMatchObject({
      shiftCount: 2,
      effectiveHours: 10,
      totalTips: 250,
      netIncome: 330,
      averageActualHourly: 33,
    });
  });

  it("builds a calendar month including leading and trailing days", () => {
    const days = buildMonthDays("2026-08-23");

    expect(days).toHaveLength(42);
    expect(days[0].date).toBe("2026-07-26");
    expect(days.find((day) => day.date === "2026-08-23")?.isCurrentMonth).toBe(true);
  });
});
