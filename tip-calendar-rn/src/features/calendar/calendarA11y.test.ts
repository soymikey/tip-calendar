import { calendarDayAccessibilityLabel } from "./calendarA11y"

describe("calendarDayAccessibilityLabel", () => {
  it("announces the date when the day has no amount", () => {
    expect(calendarDayAccessibilityLabel("2026-08-24")).toBe("Monday, August 24")
  })

  it("includes net income when the day has a shift", () => {
    expect(calendarDayAccessibilityLabel("2026-08-24", 20700)).toBe(
      "Monday, August 24, $207.00",
    )
  })
})
