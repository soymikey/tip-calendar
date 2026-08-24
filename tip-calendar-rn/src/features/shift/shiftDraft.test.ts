import { createRestaurant } from "../../domain/restaurant"
import { canSaveShift, previewShiftIncome, toShift } from "./shiftDraft"

const restaurant = createRestaurant({
  name: "Bluebird",
  payType: "hourly",
  payAmountCents: 1500,
  defaultTipOutRule: { type: "tips_percent", percent: 3 },
  now: "2026-08-21T20:00:00.000Z",
})

const draft = {
  localDate: "2026-08-21",
  restaurantId: restaurant.id,
  hours: 6.5,
  cashTipsCents: 8500,
  cardTipsCents: 12200,
}

describe("shiftDraft", () => {
  it("blocks save until hours are greater than 0", () => {
    expect(canSaveShift({ ...draft, hours: 0 })).toBe(false)
    expect(canSaveShift(draft)).toBe(true)
  })

  it("previews net income from the restaurant pay and tip-out rules", () => {
    const income = previewShiftIncome(draft, restaurant)
    expect(income.totalTipsCents).toBe(20700)
    expect(income.wageIncomeCents).toBe(9750)
    expect(income.tipOutCents).toBe(621)
    expect(income.netIncomeCents).toBe(29829)
  })

  it("builds a shift with a tip-out snapshot", () => {
    const shift = toShift(draft, restaurant, "2026-08-21T20:00:00.000Z")
    expect(shift.localDate).toBe("2026-08-21")
    expect(shift.hours).toBe(6.5)
    expect(shift.tipOutSnapshot.amountCents).toBe(621)
    expect(shift.tipOutSnapshot.rule).toEqual({ type: "tips_percent", percent: 3 })
  })
})
