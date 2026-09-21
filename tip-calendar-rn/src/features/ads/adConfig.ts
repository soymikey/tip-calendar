/* eslint-disable @typescript-eslint/no-require-imports */

let showAdPromise: Promise<boolean> | null = null

async function fetchShowAd(): Promise<boolean> {
  try {
    const { getRemoteConfig, fetchAndActivate, getValue } = require("@react-native-firebase/remote-config") as typeof import("@react-native-firebase/remote-config")
    const config = getRemoteConfig()
    config.defaultConfig = { showAd: false }
    config.settings = {
      ...config.settings,
      minimumFetchIntervalMillis: __DEV__ ? 0 : 43_200_000,
    }
    await fetchAndActivate(config)
    const value = getValue(config, "showAd")
    const showAd = value.asBoolean() === true
    console.info("[Remote Config]", { key: "showAd", value: showAd, source: value.getSource() })
    return showAd
  } catch (error) {
    console.info("[Remote Config]", {
      key: "showAd",
      value: false,
      source: "fallback",
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

export function loadShowAd(): Promise<boolean> {
  showAdPromise ??= fetchShowAd()
  return showAdPromise
}

export function resetAdConfigForTests(): void {
  showAdPromise = null
}
