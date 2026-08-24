import { createRestaurant } from "../../domain/restaurant"
import { createShift } from "../../domain/shift"

import { summarizeCalendar } from "./calendarSummary"

const restaurant = createRestaurant({
  name: "Bluebird",
  payType: "none",
  now: "2026-08-21T20:00:00.000Z",
})

function shift(localDate: string, cashTipsCents: number, hours = 5) {
  return createShift({
    localDate,
    restaurantId: restaurant.id,
    hours,
    cashTipsCents,
    cardTipsCents: 0,
    tipOutSnapshot: { rule: { type: "none" }, amountCents: 0 },
    now: "2026-08-21T20:00:00.000Z",
    id: `sft_${localDate}_${cashTipsCents}`,
  })
}

describe("summarizeCalendar", () => {
  it("groups net income by local date and fills week, month, hourly", () => {
    const summary = summarizeCalendar({
      shifts: [
        shift("2026-08-16", 10000),
        shift("2026-08-21", 20700, 6.5),
        shift("2026-07-31", 5000),
      ],
      restaurants: [restaurant],
      weekAnchor: "2026-08-21",
      year: 2026,
      month: 8,
      weekStartsOn: 0,
    })
    expect(summary.byDate.get("2026-08-21")).toBe(20700)
    expect(summary.weekCents).toBe(30700)
    expect(summary.monthCents).toBe(30700)
    expect(summary.hourlyCents).toBe(Math.round(30700 / 11.5))
  })

  it("uses the selected date's week when browsing another month", () => {
    const summary = summarizeCalendar({
      shifts: [shift("2026-08-16", 10000), shift("2026-09-02", 8000)],
      restaurants: [restaurant],
      weekAnchor: "2026-09-01",
      year: 2026,
      month: 9,
      weekStartsOn: 0,
    })
    expect(summary.weekCents).toBe(8000)
    expect(summary.monthCents).toBe(8000)
  })
})
