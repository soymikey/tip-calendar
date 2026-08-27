import { createRestaurant } from "../../domain/restaurant"
import { nextDefaultRestaurantId, paySummary, removeRestaurant, upsertRestaurant } from "./restaurantList"

const bluebird = createRestaurant({
  name: "Bluebird",
  now: "2026-08-21T20:00:00.000Z",
  id: "rst_1",
})
const harbor = createRestaurant({
  name: "Harbor",
  now: "2026-08-21T21:00:00.000Z",
  id: "rst_2",
})

describe("upsertRestaurant", () => {
  it("adds a restaurant without touching other rows", () => {
    const next = upsertRestaurant([bluebird], harbor)
    expect(next).toHaveLength(2)
    expect(next.map((item) => item.id)).toEqual(["rst_1", "rst_2"])
  })
})

describe("removeRestaurant", () => {
  it("deletes the row and leaves shifts to the caller", () => {
    expect(removeRestaurant([bluebird, harbor], "rst_1")).toEqual([harbor])
  })
})

describe("nextDefaultRestaurantId", () => {
  it("keeps the current default when it still exists", () => {
    expect(nextDefaultRestaurantId([bluebird, harbor], "rst_2")).toBe("rst_2")
  })

  it("falls back to the first remaining restaurant", () => {
    expect(nextDefaultRestaurantId([harbor], "rst_1")).toBe("rst_2")
  })

  it("is null when no restaurants remain", () => {
    expect(nextDefaultRestaurantId([], "rst_1")).toBeNull()
  })
})

describe("paySummary", () => {
  it("describes hourly pay", () => {
    expect(paySummary({ ...bluebird, payType: "hourly", payAmountCents: 1500 })).toBe(
      "Hourly $15.00/hr",
    )
  })
})
