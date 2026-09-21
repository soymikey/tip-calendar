/* eslint-disable @typescript-eslint/no-require-imports */

export type AdEnvironment = "development" | "preview" | "production"

const PRODUCTION_BANNER_ID = "ca-app-pub-3534156575856999/7356442883"

export function getAdEnvironment(): AdEnvironment {
  const configured = process.env.EXPO_PUBLIC_APP_ENV
  if (configured === "development" || configured === "preview" || configured === "production") {
    return configured
  }
  return __DEV__ ? "development" : "production"
}

export function getBannerAdUnitId(environment: AdEnvironment): string {
  if (environment === "production") {
    return PRODUCTION_BANNER_ID
  }
  return require("react-native-google-mobile-ads").TestIds.ADAPTIVE_BANNER
}
