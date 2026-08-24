import { nextCalendarPress } from "./calendarPress"

describe("nextCalendarPress", () => {
  it("selects a date on the first tap without opening", () => {
    expect(nextCalendarPress(null, "2026-08-21")).toEqual({
      selectedLocalDate: "2026-08-21",
      armedLocalDate: "2026-08-21",
      open: false,
    })
  })

  it("opens on a second tap of the same date", () => {
    expect(nextCalendarPress("2026-08-21", "2026-08-21")).toEqual({
      selectedLocalDate: "2026-08-21",
      armedLocalDate: "2026-08-21",
      open: true,
    })
  })

  it("selects a different date without opening", () => {
    expect(nextCalendarPress("2026-08-21", "2026-08-22")).toEqual({
      selectedLocalDate: "2026-08-22",
      armedLocalDate: "2026-08-22",
      open: false,
    })
  })
})
