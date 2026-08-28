import { calendarCellChrome, nextCalendarPress, nextFilledDate } from "./calendarPress"

describe("calendarCellChrome", () => {
  it("washes today without a selection border before the first tap", () => {
    expect(
      calendarCellChrome({
        selected: true,
        filled: false,
        peeked: false,
        isToday: true,
      }),
    ).toEqual({ fill: false, border: false, todayWash: true })
  })

  it("adds a border on the first tap", () => {
    expect(
      calendarCellChrome({
        selected: true,
        filled: false,
        peeked: true,
        isToday: true,
      }),
    ).toEqual({ fill: false, border: true, todayWash: true })
  })

  it("fills on the second tap and hides the today wash", () => {
    expect(
      calendarCellChrome({
        selected: true,
        filled: true,
        peeked: true,
        isToday: true,
      }),
    ).toEqual({ fill: true, border: false, todayWash: false })
  })
})

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

  it("does not open again while a shift form is already opening", () => {
    expect(nextCalendarPress("2026-08-21", "2026-08-21", true)).toEqual({
      selectedLocalDate: "2026-08-21",
      armedLocalDate: "2026-08-21",
      open: false,
    })
  })
})

describe("nextFilledDate", () => {
  it("keeps the filled date until another date is peeked", () => {
    expect(nextFilledDate("2026-08-21", "2026-08-21", true)).toBe("2026-08-21")
    expect(nextFilledDate("2026-08-21", "2026-08-21", false)).toBe("2026-08-21")
    expect(nextFilledDate("2026-08-21", "2026-08-22", false)).toBeNull()
  })
})
