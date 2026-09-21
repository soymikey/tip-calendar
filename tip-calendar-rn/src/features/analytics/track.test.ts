import { isExpoGo } from "./expoRuntime"

/* eslint-disable @typescript-eslint/no-require-imports */

import {
  AnalyticsEvent,
  configureNativeAnalytics,
  onboardingCompletedParams,
  resetAnalyticsReporter,
  setAnalyticsReporter,
  shiftSavedParams,
  track,
} from "./track"

jest.mock("./expoRuntime", () => ({
  isExpoGo: jest.fn(() => false),
}))

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
  let warnSpy: jest.SpyInstance

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined)
  })

  afterEach(() => {
    warnSpy.mockRestore()
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

describe("configureNativeAnalytics", () => {
  const crashlytics = require("@react-native-firebase/crashlytics") as {
    default: () => unknown
  }
  const analytics = require("@react-native-firebase/analytics") as {
    default: () => unknown
  }
  const originalCrashlytics = crashlytics.default
  const originalAnalytics = analytics.default
  let warnSpy: jest.SpyInstance

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined)
  })

  afterEach(() => {
    warnSpy.mockRestore()
    crashlytics.default = originalCrashlytics
    analytics.default = originalAnalytics
    ;(isExpoGo as jest.Mock).mockReturnValue(false)
    resetAnalyticsReporter()
  })

  it("does not load Firebase native modules in Expo Go", async () => {
    ;(isExpoGo as jest.Mock).mockReturnValue(true)
    const factory = jest.fn(() => {
      throw new Error("should not load native firebase")
    })
    crashlytics.default = factory
    analytics.default = factory

    await configureNativeAnalytics(true)

    expect(factory).not.toHaveBeenCalled()
  })

  it("does not swap the reporter when crashlytics cannot load", async () => {
    crashlytics.default = () => {
      throw new Error("native module missing")
    }
    const reporter = jest.fn().mockResolvedValue(undefined)
    setAnalyticsReporter(reporter)

    await configureNativeAnalytics(true)
    await track(AnalyticsEvent.shiftSaved)

    expect(reporter).toHaveBeenCalledWith("shift_saved", undefined)
  })

  it("does not swap the reporter when analytics cannot load", async () => {
    analytics.default = () => {
      throw new Error("native module missing")
    }
    const reporter = jest.fn().mockResolvedValue(undefined)
    setAnalyticsReporter(reporter)

    await configureNativeAnalytics(true)
    await track(AnalyticsEvent.shiftSaved)

    expect(reporter).toHaveBeenCalledWith("shift_saved", undefined)
  })

  it("keeps event reporting disabled when consent is not granted", async () => {
    const setAnalyticsCollectionEnabled = jest.fn().mockResolvedValue(undefined)
    const setCrashlyticsCollectionEnabled = jest.fn().mockResolvedValue(undefined)
    analytics.default = () => ({ logEvent: jest.fn(), setAnalyticsCollectionEnabled })
    crashlytics.default = () => ({ setCrashlyticsCollectionEnabled })

    await configureNativeAnalytics(false)

    expect(setAnalyticsCollectionEnabled).toHaveBeenCalledWith(false)
    expect(setCrashlyticsCollectionEnabled).toHaveBeenCalledWith(false)
  })

  it("enables event reporting only after consent", async () => {
    const logEvent = jest.fn().mockResolvedValue(undefined)
    const setAnalyticsCollectionEnabled = jest.fn().mockResolvedValue(undefined)
    const setCrashlyticsCollectionEnabled = jest.fn().mockResolvedValue(undefined)
    analytics.default = () => ({ logEvent, setAnalyticsCollectionEnabled })
    crashlytics.default = () => ({ setCrashlyticsCollectionEnabled })

    await configureNativeAnalytics(true)
    await track(AnalyticsEvent.shiftSaved)

    expect(setAnalyticsCollectionEnabled).toHaveBeenCalledWith(true)
    expect(setCrashlyticsCollectionEnabled).toHaveBeenCalledWith(true)
    expect(logEvent).toHaveBeenCalledWith("shift_saved", undefined)
  })
})
