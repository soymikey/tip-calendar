import { defaultSelectedDate } from "./CalendarMonth"

describe("defaultSelectedDate", () => {
  it("selects today when the visible month is the current month", () => {
    const today = new Date(2026, 7, 24)
    expect(defaultSelectedDate(2026, 8, today)).toBe("2026-08-24")
  })

  it("selects the first of the month when browsing another month", () => {
    const today = new Date(2026, 7, 24)
    expect(defaultSelectedDate(2026, 7, today)).toBe("2026-07-01")
  })
})
