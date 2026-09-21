/* eslint-disable @typescript-eslint/no-require-imports */
import { useState } from "react"
import { View } from "react-native"

import { useAds } from "./AdProvider"
import { getAdEnvironment, getBannerAdUnitId } from "./adUnit"

type Props = { testID?: string }

export function AdBannerSlot({ testID }: Props) {
  const { eligible } = useAds()
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!eligible || failed) {
    return null
  }

  const { BannerAd, BannerAdSize } = require("react-native-google-mobile-ads")

  return (
    <View
      testID={testID}
      accessibilityElementsHidden={!loaded}
      style={{
        alignItems: "center",
        backgroundColor: "#F2F2F7",
        height: loaded ? "auto" : 0,
        overflow: "hidden",
      }}>
      <BannerAd
        unitId={getBannerAdUnitId(getAdEnvironment())}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdLoaded={() => {
          console.info("[Ads] banner loaded")
          setLoaded(true)
        }}
        onAdFailedToLoad={(error: Error) => {
          console.warn("[Ads] banner failed", { error: error.message })
          setFailed(true)
        }}
      />
    </View>
  )
}
