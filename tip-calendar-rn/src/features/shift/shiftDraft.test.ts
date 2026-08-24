import { createRestaurant } from "../../domain/restaurant"
import {
  canSaveShift,
  fromShift,
  insertShiftAt,
  previewShiftIncome,
  removeShift,
  replaceShift,
  shiftsOnDate,
  toShift,
  toUpdatedShift,
} from "./shiftDraft"

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

  it("lists shifts on one local date", () => {
    const lunch = toShift(draft, restaurant, "2026-08-21T12:00:00.000Z")
    const dinner = toShift({ ...draft, hours: 5 }, restaurant, "2026-08-21T22:00:00.000Z")
    const otherDay = toShift({ ...draft, localDate: "2026-08-22" }, restaurant, "2026-08-22T20:00:00.000Z")
    expect(shiftsOnDate([lunch, dinner, otherDay], "2026-08-21").map((shift) => shift.id)).toEqual([
      lunch.id,
      dinner.id,
    ])
  })

  it("replaces a shift by id and keeps createdAt", () => {
    const lunch = toShift(draft, restaurant, "2026-08-21T20:00:00.000Z")
    const dinner = toShift({ ...draft, hours: 5 }, restaurant, "2026-08-21T22:00:00.000Z")
    const next = toUpdatedShift(
      { ...fromShift(lunch), hours: 4 },
      restaurant,
      lunch,
      "2026-08-22T00:00:00.000Z",
    )
    const list = replaceShift([lunch, dinner], next)
    expect(list[0]?.hours).toBe(4)
    expect(list[0]?.id).toBe(lunch.id)
    expect(list[0]?.createdAt).toBe(lunch.createdAt)
    expect(list[0]?.updatedAt).toBe("2026-08-22T00:00:00.000Z")
    expect(list[1]?.id).toBe(dinner.id)
  })

  it("removes a shift and returns it for undo", () => {
    const lunch = toShift(draft, restaurant, "2026-08-21T12:00:00.000Z")
    const dinner = toShift({ ...draft, hours: 5 }, restaurant, "2026-08-21T22:00:00.000Z")
    const { remaining, removed, index } = removeShift([lunch, dinner], lunch.id)
    expect(remaining).toEqual([dinner])
    expect(removed?.id).toBe(lunch.id)
    expect(index).toBe(0)
    expect(insertShiftAt(remaining, removed!, index)).toEqual([lunch, dinner])
  })
})
