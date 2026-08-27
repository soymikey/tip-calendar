/// <reference types="jest" />

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
