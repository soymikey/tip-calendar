import { canContinueStep, completeOnboarding, reduceOnboarding } from "./onboardingDraft"

const start = reduceOnboarding(undefined, { type: "init" })

describe("onboardingDraft", () => {
  it("blocks step 1 without a trimmed name", () => {
    expect(canContinueStep(start)).toBe(false)
    const named = reduceOnboarding(start, { type: "setName", name: "  Bluebird  " })
    expect(canContinueStep(named)).toBe(true)
  })

  it("keeps skipped pay and tip-out as unset", () => {
    let draft = reduceOnboarding(start, { type: "setName", name: "Bluebird" })
    draft = reduceOnboarding(draft, { type: "next" })
    draft = reduceOnboarding(draft, { type: "skipPay" })
    draft = reduceOnboarding(draft, { type: "skipTipOut" })
    const restaurant = completeOnboarding(draft, "2026-08-21T20:00:00.000Z")
    expect(restaurant.name).toBe("Bluebird")
    expect(restaurant.isDefault).toBe(true)
    expect(restaurant.payType).toBe("none")
    expect(restaurant.payAmountCents).toBe(0)
    expect(restaurant.defaultTipOutRule).toEqual({ type: "none" })
  })

  it("stores hourly pay and a tips-percent rule", () => {
    let draft = reduceOnboarding(undefined, { type: "init" })
    draft = reduceOnboarding(draft, { type: "setName", name: "Harbor" })
    draft = reduceOnboarding(draft, { type: "next" })
    draft = reduceOnboarding(draft, {
      type: "setPay",
      payType: "hourly",
      payAmountCents: 1800,
    })
    draft = reduceOnboarding(draft, { type: "next" })
    draft = reduceOnboarding(draft, {
      type: "setTipOut",
      rule: { type: "tips_percent", percent: 3 },
    })
    const restaurant = completeOnboarding(draft, "2026-08-21T20:00:00.000Z")
    expect(restaurant.payType).toBe("hourly")
    expect(restaurant.payAmountCents).toBe(1800)
    expect(restaurant.defaultTipOutRule).toEqual({ type: "tips_percent", percent: 3 })
  })

  it("requires an amount when hourly or fixed is selected", () => {
    let draft = reduceOnboarding(start, { type: "setName", name: "Bluebird" })
    draft = reduceOnboarding(draft, { type: "next" })
    draft = reduceOnboarding(draft, { type: "setPay", payType: "hourly", payAmountCents: 0 })
    expect(canContinueStep(draft)).toBe(false)
  })
})
