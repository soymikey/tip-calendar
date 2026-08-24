import { formatLongShiftDate } from "./DayDetailsSheet"

describe("formatLongShiftDate", () => {
  it("formats a long weekday date", () => {
    expect(formatLongShiftDate("2026-08-21")).toBe("Friday, August 21")
  })
})
