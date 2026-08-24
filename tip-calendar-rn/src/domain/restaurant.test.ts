import { createRestaurant } from "./restaurant"

describe("createRestaurant", () => {
  it("trims the name and marks the first restaurant as default", () => {
    const restaurant = createRestaurant({
      name: "  Bluebird Diner  ",
      now: "2026-08-21T20:00:00.000Z",
    })

    expect(restaurant.name).toBe("Bluebird Diner")
    expect(restaurant.isDefault).toBe(true)
    expect(restaurant.payType).toBe("none")
    expect(restaurant.payAmountCents).toBe(0)
    expect(restaurant.defaultTipOutRule).toEqual({ type: "none" })
    expect(restaurant.creditCardTipPayout).toBe("same_day")
  })

  it("rejects a blank name", () => {
    expect(() => createRestaurant({ name: "   " })).toThrow("Restaurant name is required")
  })

  it("stores hourly pay and a tips-percent tip-out", () => {
    const restaurant = createRestaurant({
      name: "Harbor Grill",
      payType: "hourly",
      payAmountCents: 1500,
      defaultTipOutRule: { type: "tips_percent", percent: 3 },
    })

    expect(restaurant.payType).toBe("hourly")
    expect(restaurant.payAmountCents).toBe(1500)
    expect(restaurant.defaultTipOutRule).toEqual({ type: "tips_percent", percent: 3 })
  })
})
