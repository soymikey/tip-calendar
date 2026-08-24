import { describe, expect, it } from "vitest";
import { calculateShift, validateShiftInput } from "./shift";

describe("shift calculations", () => {
  it("calculates tips, wage, total income, net income, and actual hourly rate", () => {
    const result = calculateShift({
      payType: "hourly",
      payAmount: 12.5,
      hours: 6,
      unpaidBreak: 0.5,
      cashTips: 45,
      creditTips: 180,
      otherIncome: 20,
      manualTipOut: 35,
    });

    expect(result).toMatchObject({
      effectiveHours: 5.5,
      totalTips: 225,
      wageIncome: 68.75,
      totalIncome: 313.75,
      netIncome: 278.75,
      actualHourly: 50.68,
    });
  });

  it("uses fixed shift pay without multiplying by hours", () => {
    const result = calculateShift({
      payType: "fixedShift",
      payAmount: 80,
      hours: 4,
      unpaidBreak: 0,
      cashTips: 20,
      creditTips: 30,
      otherIncome: 0,
      manualTipOut: 10,
    });

    expect(result.wageIncome).toBe(80);
    expect(result.netIncome).toBe(120);
    expect(result.actualHourly).toBe(30);
  });

  it("calculates cross-midnight clock in and out hours when more options are used", () => {
    const result = calculateShift({
      payType: "hourly",
      payAmount: 10,
      hours: 0,
      clockIn: "22:30",
      clockOut: "02:00",
      unpaidBreak: 0.5,
      cashTips: 0,
      creditTips: 0,
      otherIncome: 0,
      manualTipOut: 0,
    });

    expect(result.rawHours).toBe(3.5);
    expect(result.effectiveHours).toBe(3);
    expect(result.isCrossMidnight).toBe(true);
  });

  it("returns validation messages for zero hours, invalid money, and excessive tip-out", () => {
    const errors = validateShiftInput({
      payType: "hourly",
      payAmount: 12,
      hours: 0,
      unpaidBreak: 0,
      cashTips: -1,
      creditTips: 20,
      otherIncome: 0,
      manualTipOut: 100,
    });

    expect(errors).toContain("Enter work hours greater than 0.");
    expect(errors).toContain("Amounts cannot be negative.");
    expect(errors).toContain("Tip-out cannot be higher than total income.");
  });
});
