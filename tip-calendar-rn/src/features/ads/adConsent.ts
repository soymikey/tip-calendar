/* eslint-disable @typescript-eslint/no-require-imports */

import { getAdEnvironment, type AdEnvironment } from "./adUnit"

export type AdConsentState = {
  canRequestAds: boolean
  privacyOptionsRequired: boolean
}

export function canPreviewTestAdWithoutForm(
  isDevelopmentBuild: boolean,
  environment: AdEnvironment,
  errorMessage: string,
): boolean {
  return (
    isDevelopmentBuild &&
    environment === "development" &&
    errorMessage.includes("no form(s) configured for the input app ID")
  )
}

export async function requestAdConsent(): Promise<AdConsentState> {
  try {
    const {
      AdsConsent,
      AdsConsentPrivacyOptionsRequirementStatus,
    } = require("react-native-google-mobile-ads")
    const consent = await AdsConsent.gatherConsent()

    const result = {
      canRequestAds: consent.canRequestAds === true,
      privacyOptionsRequired:
        consent.privacyOptionsRequirementStatus ===
        AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
    }
    console.info("[Ads] consent", result)
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.info("[Ads] consent failed", {
      error: message,
    })
    if (canPreviewTestAdWithoutForm(__DEV__, getAdEnvironment(), message)) {
      console.info("[Ads] previewing Google test ad without an AdMob consent form")
      return { canRequestAds: true, privacyOptionsRequired: false }
    }
    return { canRequestAds: false, privacyOptionsRequired: false }
  }
}

export async function showAdPrivacyOptions(): Promise<void> {
  const { AdsConsent } = require("react-native-google-mobile-ads")
  await AdsConsent.showPrivacyOptionsForm()
}

export async function initializeMobileAds(): Promise<boolean> {
  try {
    const mobileAds = require("react-native-google-mobile-ads").default
    await mobileAds().initialize()
    console.info("[Ads] SDK initialized")
    return true
  } catch (error) {
    console.info("[Ads] SDK initialization failed", {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}
