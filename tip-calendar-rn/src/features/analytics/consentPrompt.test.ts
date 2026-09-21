import { shouldShowAnalyticsPrompt } from "./consentPrompt"

describe("shouldShowAnalyticsPrompt", () => {
  it("waits until a new user reaches the calendar after onboarding", () => {
    expect(shouldShowAnalyticsPrompt(true, false, true, null)).toBe(false)
    expect(shouldShowAnalyticsPrompt(true, true, false, null)).toBe(false)
    expect(shouldShowAnalyticsPrompt(true, true, true, null)).toBe(true)
  })

  it("does not interrupt existing users on upgrade", () => {
    expect(shouldShowAnalyticsPrompt(false, true, true, null)).toBe(false)
  })

  it("does not ask again after either choice", () => {
    expect(shouldShowAnalyticsPrompt(true, true, true, true)).toBe(false)
    expect(shouldShowAnalyticsPrompt(true, true, true, false)).toBe(false)
  })
})
