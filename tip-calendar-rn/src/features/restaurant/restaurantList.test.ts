import { createRestaurant } from "../../domain/restaurant"
import { paySummary, removeRestaurant, upsertRestaurant } from "./restaurantList"

const bluebird = createRestaurant({
  name: "Bluebird",
  now: "2026-08-21T20:00:00.000Z",
  id: "rst_1",
})
const harbor = createRestaurant({
  name: "Harbor",
  isDefault: false,
  now: "2026-08-21T21:00:00.000Z",
  id: "rst_2",
})

describe("upsertRestaurant", () => {
  it("adds a restaurant and keeps a single default", () => {
    const next = upsertRestaurant([bluebird], { ...harbor, isDefault: true })
    expect(next).toHaveLength(2)
    expect(next.find((item) => item.id === "rst_2")?.isDefault).toBe(true)
    expect(next.find((item) => item.id === "rst_1")?.isDefault).toBe(false)
  })
})

describe("removeRestaurant", () => {
  it("promotes another restaurant when the default is deleted", () => {
    const next = removeRestaurant([bluebird, harbor], "rst_1")
    expect(next).toHaveLength(1)
    expect(next[0]?.id).toBe("rst_2")
    expect(next[0]?.isDefault).toBe(true)
  })
})

describe("paySummary", () => {
  it("describes hourly pay", () => {
    expect(paySummary({ ...bluebird, payType: "hourly", payAmountCents: 1500 })).toBe(
      "Hourly $15.00/hr",
    )
  })
})
