import {
  addDays,
  buildMonthGrid,
  endOfWeek,
  groupNetIncomeByLocalDate,
  startOfWeek,
  weekdayLetters,
} from "./calendar"
import type { Shift } from "./shift"

function shift(localDate: string, netIncomeCents: number): Shift {
  return {
    id: `s-${localDate}-${netIncomeCents}`,
    localDate,
    restaurantId: "rst_1",
    restaurantName: "Bluebird",
    hours: 5,
    unpaidBreakHours: 0,
    overnight: false,
    cashTipsCents: netIncomeCents,
    cardTipsCents: 0,
    otherIncomeCents: 0,
    tipOutSnapshot: { type: "none", amountCents: 0 },
    paySnapshot: { payType: "none", payAmountCents: 0 },
    incomeSnapshot: {
      totalTipsCents: netIncomeCents,
      wageIncomeCents: 0,
      otherIncomeCents: 0,
      grossIncomeCents: netIncomeCents,
      tipOutCents: 0,
      netIncomeCents,
      effectiveHours: 5,
      effectiveHourlyCents: Math.round(netIncomeCents / 5),
    },
    createdAt: "2026-08-21T00:00:00.000Z",
    updatedAt: "2026-08-21T00:00:00.000Z",
  }
}

describe("startOfWeek", () => {
  it("starts on Sunday by default", () => {
    expect(startOfWeek("2026-08-21", 0)).toBe("2026-08-16")
  })

  it("starts on Monday when preferences say so", () => {
    expect(startOfWeek("2026-08-21", 1)).toBe("2026-08-17")
  })
})

describe("addDays and endOfWeek", () => {
  it("adds days across month boundaries", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01")
  })

  it("ends the week six days after the start", () => {
    expect(endOfWeek("2026-08-21", 0)).toBe("2026-08-22")
    expect(endOfWeek("2026-08-21", 1)).toBe("2026-08-23")
  })
})

describe("weekdayLetters", () => {
  it("keeps Sunday-first headers by default", () => {
    expect(weekdayLetters(0)).toEqual(["S", "M", "T", "W", "T", "F", "S"])
  })

  it("rotates headers when the week starts on Monday", () => {
    expect(weekdayLetters(1)).toEqual(["M", "T", "W", "T", "F", "S", "S"])
  })
})

describe("buildMonthGrid", () => {
  it("builds August 2025 with Sunday-first weeks and trailing empty cells", () => {
    const grid = buildMonthGrid(2025, 8, 0)
    expect(grid[0]?.[0]).toBeNull()
    expect(grid[0]?.[5]).toEqual({ localDate: "2025-08-01", day: 1 })
    expect(grid[4]?.[6]).toEqual({ localDate: "2025-08-30", day: 30 })
    expect(grid[5]?.[0]).toEqual({ localDate: "2025-08-31", day: 31 })
  })
})

describe("groupNetIncomeByLocalDate", () => {
  it("sums same-day shifts and ignores other months", () => {
    const grouped = groupNetIncomeByLocalDate(
      [shift("2025-08-21", 14200), shift("2025-08-21", 13100), shift("2025-07-31", 9999)],
      (item) => item.cashTipsCents,
    )
    expect(grouped.get("2025-08-21")).toBe(27300)
    expect(grouped.get("2025-07-31")).toBe(9999)
  })
})
