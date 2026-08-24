import { describe, expect, it } from "vitest";
import { formatPaySummary, normalizePayAmount } from "./restaurant";

describe("restaurant settings", () => {
  it("normalizes invalid pay amounts to zero", () => {
    expect(normalizePayAmount(Number.NaN)).toBe(0);
    expect(normalizePayAmount(-12)).toBe(0);
    expect(normalizePayAmount(12.345)).toBe(12.35);
  });

  it("describes hourly and fixed shift pay in plain language", () => {
    expect(formatPaySummary({ payType: "hourly", payAmount: 12.5 })).toBe("$12.50 per hour");
    expect(formatPaySummary({ payType: "fixedShift", payAmount: 80 })).toBe("$80.00 per shift");
  });
});
