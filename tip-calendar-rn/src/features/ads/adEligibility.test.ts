import { isAdEligible } from "./adEligibility"

describe("isAdEligible", () => {
  it("requires both the remote flag and UMP permission", () => {
    expect(isAdEligible(true, true)).toBe(true)
    expect(isAdEligible(false, true)).toBe(false)
    expect(isAdEligible(true, false)).toBe(false)
    expect(isAdEligible(false, false)).toBe(false)
  })
})
