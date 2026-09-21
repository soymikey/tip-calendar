import type { AnalyticsEventName, AnalyticsParams, AnalyticsReporter } from "./track"

/* eslint-disable @typescript-eslint/no-require-imports */

export const logFirebaseEvent: AnalyticsReporter = async (name, params) => {
  const analytics = require("@react-native-firebase/analytics").default as () => {
    logEvent(event: AnalyticsEventName, eventParams?: AnalyticsParams): Promise<void>
  }
  await analytics().logEvent(name, params)
}

export async function initFirebaseNative(): Promise<void> {
  const crashlytics = require("@react-native-firebase/crashlytics").default as () => {
    setCrashlyticsCollectionEnabled(enabled: boolean): Promise<void>
  }
  const analytics = require("@react-native-firebase/analytics").default as () => {
    logEvent(event: AnalyticsEventName, eventParams?: AnalyticsParams): Promise<void>
    setAnalyticsCollectionEnabled(enabled: boolean): Promise<void>
  }
  await analytics().setAnalyticsCollectionEnabled(false)
  await crashlytics().setCrashlyticsCollectionEnabled(false)
}

export async function setFirebaseCollectionEnabled(enabled: boolean): Promise<void> {
  const crashlytics = require("@react-native-firebase/crashlytics").default as () => {
    setCrashlyticsCollectionEnabled(value: boolean): Promise<void>
  }
  const analytics = require("@react-native-firebase/analytics").default as () => {
    setAnalyticsCollectionEnabled(value: boolean): Promise<void>
  }
  await analytics().setAnalyticsCollectionEnabled(enabled)
  await crashlytics().setCrashlyticsCollectionEnabled(enabled)
}
