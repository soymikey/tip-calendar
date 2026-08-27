import {
  AnalyticsEvent,
  enableNativeAnalytics,
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

describe("AnalyticsEvent names", () => {
  it("matches the spec event strings", () => {
    expect(AnalyticsEvent.shiftSaved).toBe("shift_saved")
    expect(AnalyticsEvent.onboardingCompleted).toBe("onboarding_completed")
    expect(AnalyticsEvent.backupExported).toBe("backup_exported")
    expect(AnalyticsEvent.backupImported).toBe("backup_imported")
    expect(AnalyticsEvent.dataDeleted).toBe("data_deleted")
  })
})

describe("enableNativeAnalytics", () => {
  const crashlytics = require("@react-native-firebase/crashlytics") as {
    default: () => unknown
  }
  const analytics = require("@react-native-firebase/analytics") as {
    default: () => unknown
  }
  const originalCrashlytics = crashlytics.default
  const originalAnalytics = analytics.default

  afterEach(() => {
    crashlytics.default = originalCrashlytics
    analytics.default = originalAnalytics
    resetAnalyticsReporter()
  })

  it("does not swap the reporter when crashlytics cannot load", async () => {
    crashlytics.default = () => {
      throw new Error("native module missing")
    }
    const reporter = jest.fn().mockResolvedValue(undefined)
    setAnalyticsReporter(reporter)

    await enableNativeAnalytics()
    await track(AnalyticsEvent.shiftSaved)

    expect(reporter).toHaveBeenCalledWith("shift_saved", undefined)
  })

  it("does not swap the reporter when analytics cannot load", async () => {
    analytics.default = () => {
      throw new Error("native module missing")
    }
    const reporter = jest.fn().mockResolvedValue(undefined)
    setAnalyticsReporter(reporter)

    await enableNativeAnalytics()
    await track(AnalyticsEvent.shiftSaved)

    expect(reporter).toHaveBeenCalledWith("shift_saved", undefined)
  })
})
