import { createRestaurant } from "./restaurant"
import { calculateHoursFromClock, calculateShiftIncome, createShift } from "./shift"

const hourlyRestaurant = createRestaurant({
  name: "Bluebird",
  payType: "hourly",
  payAmountCents: 1500,
})

describe("calculateHoursFromClock", () => {
  it("counts a same-day shift", () => {
    expect(calculateHoursFromClock("16:00", "22:30")).toEqual({
      hours: 6.5,
      overnight: false,
    })
  })

  it("treats an earlier clock-out as overnight, not an error", () => {
    expect(calculateHoursFromClock("21:00", "02:00")).toEqual({
      hours: 5,
      overnight: true,
    })
  })
})

describe("calculateShiftIncome", () => {
  it("computes tips, hourly wage, and net income", () => {
    const income = calculateShiftIncome({
      restaurant: hourlyRestaurant,
      hours: 6.5,
      cashTipsCents: 4200,
      cardTipsCents: 8800,
    })

    expect(income.totalTipsCents).toBe(13000)
    expect(income.wageIncomeCents).toBe(9750)
    expect(income.tipOutCents).toBe(0)
    expect(income.netIncomeCents).toBe(22750)
    expect(income.effectiveHourlyCents).toBe(3500)
  })

  it("uses fixed wage instead of hours times rate", () => {
    const restaurant = createRestaurant({
      name: "Fixed Place",
      payType: "fixed",
      payAmountCents: 4000,
    })
    const income = calculateShiftIncome({
      restaurant,
      hours: 8,
      cashTipsCents: 1000,
      cardTipsCents: 2000,
    })
    expect(income.wageIncomeCents).toBe(4000)
    expect(income.netIncomeCents).toBe(7000)
  })

  it("subtracts unpaid break from effective hours", () => {
    const income = calculateShiftIncome({
      restaurant: hourlyRestaurant,
      hours: 6,
      unpaidBreakHours: 0.5,
      cashTipsCents: 0,
      cardTipsCents: 0,
    })
    expect(income.effectiveHours).toBe(5.5)
    expect(income.wageIncomeCents).toBe(8250)
  })

  it("does not compute hourly rate when effective hours are 0", () => {
    const income = calculateShiftIncome({
      restaurant: hourlyRestaurant,
      hours: 0,
      cashTipsCents: 2000,
      cardTipsCents: 0,
    })
    expect(income.effectiveHourlyCents).toBeNull()
    expect(income.netIncomeCents).toBe(2000)
  })

  it("applies a tips-percent tip-out from total tips", () => {
    const restaurant = createRestaurant({
      name: "Tip Out Place",
      payType: "none",
      defaultTipOutRule: { type: "tips_percent", percent: 3 },
    })
    const income = calculateShiftIncome({
      restaurant,
      hours: 5,
      cashTipsCents: 4000,
      cardTipsCents: 6000,
    })
    expect(income.totalTipsCents).toBe(10000)
    expect(income.tipOutCents).toBe(300)
    expect(income.netIncomeCents).toBe(9700)
  })

  it("applies a sales-percent tip-out from sales", () => {
    const restaurant = createRestaurant({
      name: "Sales Place",
      payType: "none",
      defaultTipOutRule: { type: "sales_percent", percent: 2 },
    })
    const income = calculateShiftIncome({
      restaurant,
      hours: 5,
      cashTipsCents: 1000,
      cardTipsCents: 1000,
      salesCents: 50000,
    })
    expect(income.tipOutCents).toBe(1000)
    expect(income.netIncomeCents).toBe(1000)
  })

  it("lets a shift override restaurant tip-out with a manual amount", () => {
    const restaurant = createRestaurant({
      name: "Override Place",
      defaultTipOutRule: { type: "tips_percent", percent: 5 },
    })
    const income = calculateShiftIncome({
      restaurant,
      hours: 5,
      cashTipsCents: 10000,
      cardTipsCents: 0,
      tipOutOverride: { type: "manual", amountCents: 250 },
    })
    expect(income.tipOutCents).toBe(250)
    expect(income.netIncomeCents).toBe(9750)
  })
})

describe("createShift", () => {
  it("stores a local date and money in cents", () => {
    const shift = createShift({
      localDate: "2026-08-21",
      restaurantId: "rst_1",
      hours: 6.5,
      cashTipsCents: 8500,
      cardTipsCents: 12200,
      tipOutSnapshot: { rule: { type: "none" }, amountCents: 0 },
      now: "2026-08-21T20:00:00.000Z",
    })
    expect(shift.id).toBe("sft_2026-08-21T20:00:00.000Z")
    expect(shift.localDate).toBe("2026-08-21")
    expect(shift.unpaidBreakHours).toBe(0)
    expect(shift.overnight).toBe(false)
    expect(shift.otherIncomeCents).toBe(0)
  })

  it("rejects a non-local date", () => {
    expect(() =>
      createShift({
        localDate: "2026/08/21",
        restaurantId: "rst_1",
        hours: 1,
        tipOutSnapshot: { rule: { type: "none" }, amountCents: 0 },
      }),
    ).toThrow("Date must use YYYY-MM-DD")
  })
})
