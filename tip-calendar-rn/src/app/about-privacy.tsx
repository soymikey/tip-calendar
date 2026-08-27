import { ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { StackHeader } from "@/components/StackHeader"
import { colors } from "@/theme/colors"

const PRIVACY_SECTIONS = [
  {
    title: "Your records stay on this device",
    body: "Your shift records, income amounts, restaurant settings, and preferences are saved on this device.",
  },
  {
    title: "No account required",
    body: "You can record shifts, view history, and export your data without creating an account.",
  },
  {
    title: "No cloud upload in this version",
    body: "This version does not upload your shift or income records to our servers. We do not sell your data or use your income data for advertising.",
  },
  {
    title: "Anonymous usage and crash reports",
    body: "This version sends anonymous usage counts (for example app opens and shift saves) and crash reports to an analytics service. It does not upload shift amounts, restaurant names, or dates. This data is not used for advertising and is not tied to an account.",
  },
  {
    title: "Export is your choice",
    body: "CSV and JSON export only happen when you choose to export. Exported files are yours to save, share, or delete.",
  },
  {
    title: "Back up before deleting",
    body: "Uninstalling the app or clearing local storage may remove records from this device. Use JSON backup if you want to keep a complete copy.",
  },
  {
    title: "Future cloud sync",
    body: "If a future version adds account login, cloud sync, or automatic backup, those features will be optional. Before you turn them on, the app will explain what data is uploaded, why it is uploaded, how sync works, and how you can delete it.",
  },
] as const

export default function AboutPrivacyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StackHeader title="About & privacy" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        <Text className="text-[22px] font-bold text-[#1C1C1E]">Tip Calendar</Text>
        <View className="gap-5 rounded-xl p-4" style={{ backgroundColor: colors.parchment }}>
          {PRIVACY_SECTIONS.map((section) => (
            <View key={section.title} className="gap-1.5">
              <Text className="text-[16px] font-semibold text-[#1C1C1E]">{section.title}</Text>
              <Text className="text-[16px] leading-6 text-[#1C1C1E]">{section.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
