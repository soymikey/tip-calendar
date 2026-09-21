import { isExpoGo } from "./expoRuntime"

/* eslint-disable @typescript-eslint/no-require-imports */

export const AnalyticsEvent = {
  shiftSaved: "shift_saved",
  onboardingCompleted: "onboarding_completed",
  backupExported: "backup_exported",
  backupImported: "backup_imported",
  dataDeleted: "data_deleted",
} as const

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent]

export type AnalyticsParams = {
  is_edit?: boolean
  skipped?: boolean
  kind?: "csv" | "json"
}

export type AnalyticsReporter = (
  name: AnalyticsEventName,
  params?: AnalyticsParams,
) => Promise<void>

const noopReporter: AnalyticsReporter = async () => undefined

let reporter: AnalyticsReporter = noopReporter

export function setAnalyticsReporter(next: AnalyticsReporter): void {
  reporter = next
}

export function resetAnalyticsReporter(): void {
  reporter = noopReporter
}

export function shiftSavedParams(isEdit: boolean): AnalyticsParams {
  return { is_edit: isEdit }
}

export function onboardingCompletedParams(skipped: boolean): AnalyticsParams {
  return { skipped }
}

export async function track(name: AnalyticsEventName, params?: AnalyticsParams): Promise<void> {
  try {
    await reporter(name, params)
  } catch {
    if (__DEV__) {
      console.warn(`Analytics skipped for ${name}`)
    }
  }
}

export async function configureNativeAnalytics(enabled: boolean): Promise<void> {
  if (isExpoGo()) {
    if (__DEV__) {
      console.warn("Firebase skipped (Expo Go or native module missing)")
    }
    return
  }
  try {
    const native = require("./firebaseNative") as typeof import("./firebaseNative")
    await native.setFirebaseCollectionEnabled(enabled)
    if (!enabled) {
      resetAnalyticsReporter()
      return
    }
    setAnalyticsReporter(async (name, params) => {
      try {
        await native.logFirebaseEvent(name, params)
      } catch {
        if (__DEV__) {
          console.warn(`Firebase event skipped: ${name}`)
        }
      }
    })
  } catch {
    if (__DEV__) {
      console.warn("Firebase skipped (Expo Go or native module missing)")
    }
  }
}
