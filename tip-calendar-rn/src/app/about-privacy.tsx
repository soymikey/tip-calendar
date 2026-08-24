import { ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { StackHeader } from "@/components/StackHeader"
import { colors } from "@/theme/colors"

export default function AboutPrivacyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StackHeader title="About & privacy" />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        <Text className="text-[22px] font-bold text-[#1C1C1E]">Tip Calendar</Text>
        <View className="gap-3 rounded-xl p-4" style={{ backgroundColor: colors.parchment }}>
          <Text className="text-[16px] leading-6 text-[#1C1C1E]">
            Your income stays on this iPhone. There is no account, no cloud sync, no ads, and no
            tracking.
          </Text>
          <Text className="text-[16px] leading-6 text-[#1C1C1E]">
            Data never leaves the device unless you export a CSV or JSON backup yourself.
          </Text>
        </View>
        <Text className="text-[14px] leading-5 text-[#8E8E93]">
          Tip Calendar does not collect personal data. Restoring a JSON backup replaces the records
          already stored on this iPhone after you confirm.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
