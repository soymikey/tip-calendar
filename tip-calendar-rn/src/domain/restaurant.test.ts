import { createRestaurant } from "./restaurant"

describe("createRestaurant", () => {
  it("trims the name and uses a UUID when id is omitted", () => {
    const restaurant = createRestaurant({
      name: "  Bluebird Diner  ",
      now: "2026-08-21T20:00:00.000Z",
    })

    expect(restaurant.name).toBe("Bluebird Diner")
    expect(restaurant.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(restaurant.payType).toBe("none")
    expect(restaurant.payAmountCents).toBe(0)
    expect(restaurant.defaultTipOutRule).toEqual({ type: "none" })
    expect(restaurant.creditCardTipPayout).toBe("same_day")
    expect("isDefault" in restaurant).toBe(false)
  })

  it("rejects a blank name", () => {
    expect(() => createRestaurant({ name: "   " })).toThrow("Restaurant name is required")
  })

  it("keeps an explicit id", () => {
    const restaurant = createRestaurant({
      name: "Harbor Grill",
      payType: "hourly",
      payAmountCents: 1500,
      defaultTipOutRule: { type: "tips_percent", percent: 3 },
      id: "rst_1",
    })
    expect(restaurant.id).toBe("rst_1")
    expect(restaurant.payType).toBe("hourly")
    expect(restaurant.payAmountCents).toBe(1500)
    expect(restaurant.defaultTipOutRule).toEqual({ type: "tips_percent", percent: 3 })
  })
})
