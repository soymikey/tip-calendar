import app from "../../app.json"
import eas from "../../eas.json"

const serialized = JSON.stringify(app)

describe("iOS release config", () => {
  it("uses the Tip Calendar name and a stable bundle id", () => {
    expect(app.expo.name).toBe("Tip Calendar")
    expect(app.expo.ios?.buildNumber).toBe("4")
    expect(app.expo.ios?.bundleIdentifier).toBe("app.tipcalendar")
    expect(app.expo.ios?.supportsTablet).toBe(false)
  })

  it("declares anonymous usage and crash data without tracking", () => {
    expect(app.expo.ios?.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false)
    expect(app.expo.ios?.infoPlist?.FIREBASE_ANALYTICS_COLLECTION_ENABLED).toBe(false)
    expect(app.expo.ios?.infoPlist?.FirebaseCrashlyticsCollectionEnabled).toBe(false)
    expect(app.expo.ios?.privacyManifests?.NSPrivacyTracking).toBe(false)
    const dataTypes = app.expo.ios?.privacyManifests?.NSPrivacyCollectedDataTypes ?? []
    expect(dataTypes.map((item) => item.NSPrivacyCollectedDataType)).toEqual([
      "NSPrivacyCollectedDataTypeProductInteraction",
      "NSPrivacyCollectedDataTypeCrashData",
      "NSPrivacyCollectedDataTypeDeviceID",
      "NSPrivacyCollectedDataTypeCoarseLocation",
      "NSPrivacyCollectedDataTypeOtherUsageData",
      "NSPrivacyCollectedDataTypeOtherDiagnosticData",
    ])
    expect(dataTypes.every((item) => !item.NSPrivacyCollectedDataTypeLinked)).toBe(true)
    expect(dataTypes.every((item) => !item.NSPrivacyCollectedDataTypeTracking)).toBe(true)
    expect(serialized).not.toMatch(
      /NSUserTrackingUsageDescription|NSCameraUsageDescription|NSLocationWhenInUseUsageDescription|NSMicrophoneUsageDescription/,
    )
  })

  it("has EAS preview and production iOS profiles", () => {
    expect(eas.build?.preview).toBeDefined()
    expect(eas.build?.production).toBeDefined()
  })
})
