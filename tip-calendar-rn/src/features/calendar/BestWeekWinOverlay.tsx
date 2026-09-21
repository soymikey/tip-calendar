import { useEffect, useRef } from "react"
import * as Haptics from "expo-haptics"
import { Image } from "expo-image"
import { Text, View } from "react-native"

export const BEST_WEEK_CELEBRATION_MS = 3000
const GIF_PLAY_MS = 2130

export async function celebrateBestWeek() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  } catch {
    // web and some simulators have no haptics
  }
}

export function BestWeekWinOverlay() {
  const gifRef = useRef<Image>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      void gifRef.current?.stopAnimating()
    }, GIF_PLAY_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <View
      pointerEvents="none"
      accessibilityLabel="Best day this week"
      className="items-center"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        justifyContent: "flex-end",
        paddingBottom: 40,
      }}>
      <Image
        ref={gifRef}
        source={require("../../../assets/images/best-week-celebration.gif")}
        style={{ width: 220, height: 220 }}
        contentFit="contain"
        autoplay
      />
      <Text className="mb-1 text-[17px] font-semibold text-[#1C1C1E]">Best day this week!</Text>
    </View>
  )
}
