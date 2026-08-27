import {
  AnalyticsEvent,
  onboardingCompletedParams,
  resetAnalyticsReporter,
  setAnalyticsReporter,
  shiftSavedParams,
  track,
} from "./track"

describe("analytics params", () => {
  it("only sends booleans and kind enums", () => {
    expect(shiftSavedParams(false)).toEqual({ is_edit: false })
    expect(shiftSavedParams(true)).toEqual({ is_edit: true })
    expect(onboardingCompletedParams(true)).toEqual({ skipped: true })
    const serialized = JSON.stringify({
      ...shiftSavedParams(true),
      ...onboardingCompletedParams(false),
      kind: "json",
    })
    expect(serialized).not.toMatch(/cents|restaurantName|localDate|note/i)
  })
})

describe("track", () => {
  afterEach(() => {
    resetAnalyticsReporter()
  })

  it("forwards the event name and params to the reporter", async () => {
    const reporter = jest.fn().mockResolvedValue(undefined)
    setAnalyticsReporter(reporter)
    await track(AnalyticsEvent.shiftSaved, shiftSavedParams(false))
    expect(reporter).toHaveBeenCalledWith("shift_saved", { is_edit: false })
  })

  it("swallows reporter errors", async () => {
    setAnalyticsReporter(async () => {
      throw new Error("offline")
    })
    await expect(track(AnalyticsEvent.dataDeleted)).resolves.toBeUndefined()
  })
})
