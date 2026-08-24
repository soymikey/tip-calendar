import { Image } from "expo-image"
import { Text, View } from "react-native"

import { colors } from "@/theme/colors"

export function EmptyShiftOverlay() {
  return (
    <View
      pointerEvents="none"
      className="items-center justify-center gap-3"
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
      <View
        className="items-center justify-center rounded-full p-4"
        style={{ backgroundColor: colors.parchment }}>
        <Image
          accessibilityLabel="No shifts"
          source={require("../../../assets/images/calendar-x.png")}
          style={{ width: 32, height: 32 }}
        />
      </View>
      <View className="items-center gap-1">
        <Text className="text-[17px] font-semibold text-[#1C1C1E]">No shifts recorded yet</Text>
        <Text className="text-center text-[14px] text-[#8E8E93]">
          Tap any date to add your first shift
        </Text>
      </View>
    </View>
  )
}
