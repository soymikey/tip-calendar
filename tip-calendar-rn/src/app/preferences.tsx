import { ScrollView, Switch, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { SymbolView } from "expo-symbols"

import { SettingsGroup, SettingsRow } from "@/components/SettingsRow"
import { StackHeader } from "@/components/StackHeader"
import type { WeekStartsOn } from "@/domain/calendar"
import { useAppState } from "@/state/AppStateContext"
import { colors } from "@/theme/colors"

const WEEK_DAYS: { value: WeekStartsOn; label: string }[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

function Check({ selected }: { selected: boolean }) {
  if (!selected) {
    return <View className="h-5 w-5" />
  }
  return (
    <SymbolView
      name="checkmark"
      size={16}
      tintColor={colors.action}
      fallback={<Text style={{ color: colors.action }}>✓</Text>}
    />
  )
}

export default function PreferencesScreen() {
  const { state, updateState } = useAppState()
  const { weekStartsOn, timeFormat, currencySymbol } = state.preferences

  async function setWeekStartsOn(value: WeekStartsOn) {
    await updateState((current) => ({
      ...current,
      preferences: { ...current.preferences, weekStartsOn: value },
    }))
  }

  async function setTimeFormat(value: "12h" | "24h") {
    await updateState((current) => ({
      ...current,
      preferences: { ...current.preferences, timeFormat: value },
    }))
  }

  async function setAnalyticsConsent(value: boolean) {
    await updateState((current) => ({
      ...current,
      preferences: { ...current.preferences, analyticsConsent: value },
    }))
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StackHeader title="Preferences" />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 40 }}>
        <View className="gap-2">
          <Text className="px-1 text-[13px] font-semibold uppercase text-[#8E8E93]">
            Week Starts On
          </Text>
          <SettingsGroup>
            {WEEK_DAYS.map((day) => (
              <SettingsRow
                key={day.value}
                title={day.label}
                showChevron={false}
                trailing={<Check selected={weekStartsOn === day.value} />}
                onPress={() => {
                  void setWeekStartsOn(day.value)
                }}
              />
            ))}
          </SettingsGroup>
        </View>

        <View className="gap-2">
          <Text className="px-1 text-[13px] font-semibold uppercase text-[#8E8E93]">Display</Text>
          <SettingsGroup>
            <SettingsRow title="Currency" subtitle={currencySymbol} showChevron={false} />
            <SettingsRow
              title="12-hour time"
              showChevron={false}
              trailing={<Check selected={timeFormat === "12h"} />}
              onPress={() => {
                void setTimeFormat("12h")
              }}
            />
            <SettingsRow
              title="24-hour time"
              showChevron={false}
              trailing={<Check selected={timeFormat === "24h"} />}
              onPress={() => {
                void setTimeFormat("24h")
              }}
            />
          </SettingsGroup>
        </View>

        <View className="gap-2">
          <Text className="px-1 text-[13px] font-semibold uppercase text-[#8E8E93]">Privacy</Text>
          <SettingsGroup>
            <SettingsRow
              title="Share analytics"
              subtitle="Usage counts and crash reports only"
              showChevron={false}
              trailing={
                <Switch
                  accessibilityLabel="Share analytics"
                  value={state.preferences.analyticsConsent === true}
                  onValueChange={(value) => void setAnalyticsConsent(value)}
                />
              }
            />
          </SettingsGroup>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
