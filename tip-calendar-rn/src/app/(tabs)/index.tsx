import { Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export default function CalendarScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5">
        <Text className="text-[32px] font-bold text-black">Tips Calendar</Text>
      </View>
    </SafeAreaView>
  )
}
