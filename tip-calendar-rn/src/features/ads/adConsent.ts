/* eslint-disable @typescript-eslint/no-require-imports */

export type AdConsentState = {
  canRequestAds: boolean
  privacyOptionsRequired: boolean
}

export async function requestAdConsent(): Promise<AdConsentState> {
  try {
    const {
      AdsConsent,
      AdsConsentPrivacyOptionsRequirementStatus,
    } = require("react-native-google-mobile-ads")
    const consent = await AdsConsent.gatherConsent()

    return {
      canRequestAds: consent.canRequestAds === true,
      privacyOptionsRequired:
        consent.privacyOptionsRequirementStatus ===
        AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
    }
  } catch {
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
    return true
  } catch {
    return false
  }
}
