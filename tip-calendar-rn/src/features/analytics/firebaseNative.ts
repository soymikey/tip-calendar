import type { AnalyticsEventName, AnalyticsParams, AnalyticsReporter } from "./track"

export const logFirebaseEvent: AnalyticsReporter = async (name, params) => {
  const analytics = require("@react-native-firebase/analytics").default as () => {
    logEvent(event: AnalyticsEventName, eventParams?: AnalyticsParams): Promise<void>
  }
  await analytics().logEvent(name, params)
}

export async function initFirebaseNative(): Promise<void> {
  try {
    const crashlytics = require("@react-native-firebase/crashlytics").default as () => {
      setCrashlyticsCollectionEnabled(enabled: boolean): Promise<void>
    }
    await crashlytics().setCrashlyticsCollectionEnabled(true)
  } catch {
    if (__DEV__) {
      console.warn("Firebase skipped (Expo Go or native module missing)")
    }
  }
}
