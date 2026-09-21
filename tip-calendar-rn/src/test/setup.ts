/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
)
jest.mock("@react-native-firebase/app", () => ({
  default: { app: () => ({}) },
}))
jest.mock("@react-native-firebase/analytics", () => ({
  default: () => ({
    logEvent: jest.fn().mockResolvedValue(undefined),
  }),
}))
jest.mock("@react-native-firebase/crashlytics", () => ({
  default: () => ({
    setCrashlyticsCollectionEnabled: jest.fn().mockResolvedValue(undefined),
  }),
}))
jest.mock("@react-native-firebase/remote-config", () => ({
  default: () => ({
    setDefaults: jest.fn().mockResolvedValue(undefined),
    setConfigSettings: jest.fn().mockResolvedValue(undefined),
    fetchAndActivate: jest.fn().mockResolvedValue(false),
    getValue: jest.fn(() => ({ asBoolean: () => false })),
  }),
}))
jest.mock("react-native-google-mobile-ads", () => ({
  __esModule: true,
  default: () => ({ initialize: jest.fn().mockResolvedValue(undefined) }),
  AdsConsent: {
    gatherConsent: jest.fn().mockResolvedValue({
      canRequestAds: false,
      privacyOptionsRequirementStatus: "NOT_REQUIRED",
    }),
    showPrivacyOptionsForm: jest.fn().mockResolvedValue(undefined),
  },
  AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: "REQUIRED" },
}))
