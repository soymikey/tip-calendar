import { View } from "react-native"

import { AdBannerSlot } from "@/features/ads/AdBannerSlot"
import { StatsScreen } from "@/features/stats/StatsScreen"

export default function StatsRoute() {
  return (
    <View className="flex-1 bg-white">
      <StatsScreen />
      <AdBannerSlot />
    </View>
  )
}
