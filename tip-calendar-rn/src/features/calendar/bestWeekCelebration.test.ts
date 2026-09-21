import { createRestaurant } from "../../domain/restaurant"
import { createShift } from "../../domain/shift"

import {
  requestBestWeekCelebration,
  shouldCelebrateBestDayThisWeek,
  takeBestWeekCelebration,
} from "./bestWeekCelebration"

const restaurant = createRestaurant({
  name: "Bluebird",
  payType: "none",
  now: "2026-08-21T20:00:00.000Z",
})

function shift(localDate: string, cashTipsCents: number) {
  return createShift({
    localDate,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    hours: 5,
    cashTipsCents,
    cardTipsCents: 0,
    paySnapshot: { payType: "none", payAmountCents: 0 },
    tipOutSnapshot: { type: "none", amountCents: 0 },
    now: "2026-08-21T20:00:00.000Z",
    id: `sft_${localDate}_${cashTipsCents}`,
  })
}

describe("shouldCelebrateBestDayThisWeek", () => {
  it("is true when today's net strictly beats every other day this week", () => {
    expect(
      shouldCelebrateBestDayThisWeek({
        shifts: [shift("2026-08-16", 10000), shift("2026-08-21", 20700)],
        savedLocalDate: "2026-08-21",
        todayLocalDate: "2026-08-21",
        weekStartsOn: 0,
      }),
    ).toBe(true)
  })

  it("is false when the saved date is not today", () => {
    expect(
      shouldCelebrateBestDayThisWeek({
        shifts: [shift("2026-08-16", 10000), shift("2026-08-20", 20700)],
        savedLocalDate: "2026-08-20",
        todayLocalDate: "2026-08-21",
        weekStartsOn: 0,
      }),
    ).toBe(false)
  })

  it("is false when today is the only day with earnings this week", () => {
    expect(
      shouldCelebrateBestDayThisWeek({
        shifts: [shift("2026-08-21", 20700)],
        savedLocalDate: "2026-08-21",
        todayLocalDate: "2026-08-21",
        weekStartsOn: 0,
      }),
    ).toBe(false)
  })

  it("is false when another day this week matches today's net", () => {
    expect(
      shouldCelebrateBestDayThisWeek({
        shifts: [shift("2026-08-16", 20700), shift("2026-08-21", 20700)],
        savedLocalDate: "2026-08-21",
        todayLocalDate: "2026-08-21",
        weekStartsOn: 0,
      }),
    ).toBe(false)
  })

  it("is false when another day this week earned more", () => {
    expect(
      shouldCelebrateBestDayThisWeek({
        shifts: [shift("2026-08-16", 30000), shift("2026-08-21", 20700)],
        savedLocalDate: "2026-08-21",
        todayLocalDate: "2026-08-21",
        weekStartsOn: 0,
      }),
    ).toBe(false)
  })

  it("sums multiple shifts on the same day", () => {
    expect(
      shouldCelebrateBestDayThisWeek({
        shifts: [
          shift("2026-08-16", 15000),
          shift("2026-08-21", 8000),
          shift("2026-08-21", 8000),
        ],
        savedLocalDate: "2026-08-21",
        todayLocalDate: "2026-08-21",
        weekStartsOn: 0,
      }),
    ).toBe(true)
  })

  it("ignores a higher day from another week", () => {
    expect(
      shouldCelebrateBestDayThisWeek({
        shifts: [shift("2026-08-09", 50000), shift("2026-08-16", 10000), shift("2026-08-21", 20700)],
        savedLocalDate: "2026-08-21",
        todayLocalDate: "2026-08-21",
        weekStartsOn: 0,
      }),
    ).toBe(true)
  })
})

describe("best week celebration request", () => {
  it("returns the pending flag once", () => {
    requestBestWeekCelebration()
    expect(takeBestWeekCelebration()).toBe(true)
    expect(takeBestWeekCelebration()).toBe(false)
  })
})
