import { PAY_OPTIONS, TIP_OUT_OPTIONS } from "../restaurant/payAndTipOutOptions"
import { canContinueStep, completeOnboarding, reduceOnboarding } from "./onboardingDraft"

const start = reduceOnboarding(undefined, { type: "init" })

describe("onboardingDraft", () => {
  it("defaults salary type and tip-out type to the first options", () => {
    expect(start.payType).toBe(PAY_OPTIONS[0]?.value)
    expect(start.tipOutRule.type).toBe(TIP_OUT_OPTIONS[0]?.value)
  })

  it("blocks step 1 Next without a trimmed name", () => {
    expect(canContinueStep(start)).toBe(false)
    const named = reduceOnboarding(start, { type: "setName", name: "  Bluebird  " })
    expect(canContinueStep(named)).toBe(true)
  })

  it("skips from any step straight to a saved restaurant", () => {
    const fromStep1 = completeOnboarding(
      reduceOnboarding(start, { type: "skip" }),
      "2026-08-21T20:00:00.000Z",
    )
    expect(fromStep1.name).toBe("My Restaurant")
    expect(fromStep1.payType).toBe("none")
    expect(fromStep1.defaultTipOutRule).toEqual({ type: "none" })

    let named = reduceOnboarding(start, { type: "setName", name: "Bluebird" })
    named = reduceOnboarding(named, { type: "next" })
    const fromStep2 = completeOnboarding(
      reduceOnboarding(named, { type: "skip" }),
      "2026-08-21T20:00:00.000Z",
    )
    expect(fromStep2.name).toBe("Bluebird")
    expect(fromStep2.payType).toBe("none")
  })

  it("keeps already entered pay when skipping later", () => {
    let draft = reduceOnboarding(start, { type: "setName", name: "Harbor" })
    draft = reduceOnboarding(draft, { type: "next" })
    draft = reduceOnboarding(draft, {
      type: "setPay",
      payType: "hourly",
      payAmountCents: 1800,
    })
    const restaurant = completeOnboarding(
      reduceOnboarding(draft, { type: "skip" }),
      "2026-08-21T20:00:00.000Z",
    )
    expect(restaurant.payType).toBe("hourly")
    expect(restaurant.payAmountCents).toBe(1800)
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
    expect(draft.payType).toBe("hourly")
    expect(canContinueStep(draft)).toBe(false)
    draft = reduceOnboarding(draft, { type: "setPay", payType: "hourly", payAmountCents: 0 })
    expect(canContinueStep(draft)).toBe(false)
  })

  it("requires a percent when % sales is selected", () => {
    let draft = reduceOnboarding(start, { type: "setName", name: "Bluebird" })
    draft = reduceOnboarding(draft, { type: "next" })
    draft = reduceOnboarding(draft, { type: "setPay", payType: "hourly", payAmountCents: 1800 })
    draft = reduceOnboarding(draft, { type: "next" })
    expect(draft.tipOutRule.type).toBe("sales_percent")
    expect(canContinueStep(draft)).toBe(false)
  })
})
