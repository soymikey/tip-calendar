import { createRestaurant } from "../../domain/restaurant"
import { createShift } from "../../domain/shift"
import { summarizeStats } from "./statsSummary"

const restaurant = createRestaurant({
  name: "Bluebird",
  payType: "none",
  now: "2026-08-21T20:00:00.000Z",
})

function shift(localDate: string, cashTipsCents: number, hours = 5) {
  return createShift({
    localDate,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    hours,
    cashTipsCents,
    cardTipsCents: 0,
    paySnapshot: { payType: "none", payAmountCents: 0 },
    tipOutSnapshot: { type: "none", amountCents: 0 },
    now: "2026-08-21T20:00:00.000Z",
    id: `sft_${localDate}_${cashTipsCents}`,
  })
}

describe("summarizeStats", () => {
  it("matches week net income with the calendar week total", () => {
    const summary = summarizeStats({
      shifts: [shift("2026-08-16", 10000), shift("2026-08-21", 20700, 6.5), shift("2026-07-31", 5000)],
      restaurants: [restaurant],
      mode: "week",
      weekStart: "2026-08-16",
      year: 2026,
      month: 8,
      weekStartsOn: 0,
    })
    expect(summary.netIncomeCents).toBe(30700)
    expect(summary.totalTipsCents).toBe(30700)
    expect(summary.shiftsWorked).toBe(2)
    expect(summary.hoursWorked).toBe(11.5)
    expect(summary.days).toHaveLength(7)
    expect(summary.days[5]?.netCents).toBe(20700)
    expect(summary.days[0]?.label).toContain("16")
    expect(summary.days[5]?.label).toContain("21")
  })

  it("summarizes tip-out and the best earning day in the selected range", () => {
    const tipOutShift = createShift({
      localDate: "2026-08-18",
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      hours: 5,
      cashTipsCents: 12000,
      cardTipsCents: 8000,
      paySnapshot: { payType: "none", payAmountCents: 0 },
      tipOutSnapshot: {
        type: "tips_percent",
        baseAmountCents: 20000,
        percent: 10,
        amountCents: 2000,
      },
      now: "2026-08-21T20:00:00.000Z",
      id: "sft_tip_out",
    })
    const summary = summarizeStats({
      shifts: [shift("2026-08-16", 10000), tipOutShift, shift("2026-08-21", 20700, 6.5)],
      restaurants: [restaurant],
      mode: "week",
      weekStart: "2026-08-16",
      year: 2026,
      month: 8,
      weekStartsOn: 0,
    })

    expect(summary.tipOutCents).toBe(2000)
    expect(summary.bestDay).toEqual({
      localDate: "2026-08-21",
      label: "Fri 21",
      netCents: 20700,
    })
  })

  it("does not report a best day when the range has no shifts", () => {
    const summary = summarizeStats({
      shifts: [],
      restaurants: [restaurant],
      mode: "week",
      weekStart: "2026-08-16",
      year: 2026,
      month: 8,
      weekStartsOn: 0,
    })

    expect(summary.tipOutCents).toBe(0)
    expect(summary.bestDay).toBeNull()
  })

  it("filters one restaurant", () => {
    const other = createRestaurant({ name: "Other", now: "2026-08-21T21:00:00.000Z" })
    const summary = summarizeStats({
      shifts: [
        shift("2026-08-21", 10000),
        createShift({
          localDate: "2026-08-21",
          restaurantId: other.id,
          restaurantName: other.name,
          hours: 4,
          cashTipsCents: 8000,
          cardTipsCents: 0,
          paySnapshot: { payType: "none", payAmountCents: 0 },
          tipOutSnapshot: { type: "none", amountCents: 0 },
          now: "2026-08-21T21:00:00.000Z",
          id: "sft_other",
        }),
      ],
      restaurants: [restaurant, other],
      mode: "week",
      weekStart: "2026-08-16",
      year: 2026,
      month: 8,
      restaurantId: restaurant.id,
      weekStartsOn: 0,
    })
    expect(summary.netIncomeCents).toBe(10000)
    expect(summary.shiftsWorked).toBe(1)
  })

  it("summarizes a month independently of week bounds", () => {
    const summary = summarizeStats({
      shifts: [shift("2026-08-01", 5000), shift("2026-08-31", 4000), shift("2026-09-01", 9000)],
      restaurants: [restaurant],
      mode: "month",
      weekStart: "2026-08-16",
      year: 2026,
      month: 8,
      weekStartsOn: 0,
    })
    expect(summary.netIncomeCents).toBe(9000)
    expect(summary.days).toHaveLength(31)
    expect(summary.days[0]?.netCents).toBe(5000)
    expect(summary.days[30]?.netCents).toBe(4000)
  })

  it("excludes Sunday when the week starts on Monday", () => {
    const summary = summarizeStats({
      shifts: [shift("2026-08-16", 10000), shift("2026-08-17", 5000)],
      restaurants: [restaurant],
      mode: "week",
      weekStart: "2026-08-17",
      year: 2026,
      month: 8,
      weekStartsOn: 1,
    })
    expect(summary.netIncomeCents).toBe(5000)
    expect(summary.days[0]?.localDate).toBe("2026-08-17")
  })

  it("uses frozen income when the restaurant is gone", () => {
    const recorded = shift("2026-08-21", 20700, 6.5)
    const summary = summarizeStats({
      shifts: [recorded],
      restaurants: [],
      mode: "week",
      weekStart: "2026-08-16",
      year: 2026,
      month: 8,
      weekStartsOn: 0,
    })
    expect(summary.netIncomeCents).toBe(20700)
  })
})
