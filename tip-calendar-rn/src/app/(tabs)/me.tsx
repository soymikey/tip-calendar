import { router } from "expo-router"
import { Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { SettingsGroup, SettingsRow } from "@/components/SettingsRow"

export default function MeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="px-5 pb-3 pt-4">
        <Text className="text-[32px] font-bold text-[#1C1C1E]">Me</Text>
      </View>
      <View className="px-5">
        <SettingsGroup>
          <SettingsRow
            title="Restaurant settings"
            onPress={() => router.push("/restaurant")}
          />
          <SettingsRow title="Preferences" onPress={() => router.push("/preferences")} />
          <SettingsRow title="Data & backup" onPress={() => router.push("/data-backup")} />
          <SettingsRow title="About & privacy" onPress={() => router.push("/about-privacy")} />
        </SettingsGroup>
      </View>
    </SafeAreaView>
  )
}
