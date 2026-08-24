import { createRestaurant } from "../domain/restaurant"
import { emptyState } from "../storage/types"
import { needsOnboarding } from "./session"

describe("needsOnboarding", () => {
  it("is true only when there are no restaurants", () => {
    expect(needsOnboarding(emptyState)).toBe(true)
    expect(
      needsOnboarding({
        ...emptyState,
        restaurants: [createRestaurant({ name: "Bluebird" })],
      }),
    ).toBe(false)
  })
})
