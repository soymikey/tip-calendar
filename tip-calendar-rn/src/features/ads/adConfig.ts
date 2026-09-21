/* eslint-disable @typescript-eslint/no-require-imports */

let showAdPromise: Promise<boolean> | null = null

async function fetchShowAd(): Promise<boolean> {
  try {
    const remoteConfig = require("@react-native-firebase/remote-config").default as () => {
      setDefaults(values: { showAd: boolean }): Promise<void>
      setConfigSettings(settings: { minimumFetchIntervalMillis: number }): Promise<void>
      fetchAndActivate(): Promise<boolean>
      getValue(key: "showAd"): { asBoolean(): boolean }
    }
    const config = remoteConfig()
    await config.setDefaults({ showAd: false })
    await config.setConfigSettings({ minimumFetchIntervalMillis: __DEV__ ? 0 : 43_200_000 })
    await config.fetchAndActivate()
    return config.getValue("showAd").asBoolean() === true
  } catch {
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
