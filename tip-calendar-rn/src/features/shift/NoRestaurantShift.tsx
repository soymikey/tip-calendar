import { Pressable, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { SymbolView } from "expo-symbols"

import { PrimaryButton } from "@/components/PrimaryButton"
import { parseLocalDate } from "@/domain/calendar"
import { colors } from "@/theme/colors"

type NoRestaurantShiftProps = {
  localDate: string
  onCancel: () => void
  onAddRestaurant: () => void
}

export function NoRestaurantShift({ localDate, onCancel, onAddRestaurant }: NoRestaurantShiftProps) {
  const dateLabel = parseLocalDate(localDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-[#E5E5EA] px-5 py-3">
        <View className="flex-row items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            className="min-h-[44px] w-[52px] justify-center"
            onPress={onCancel}>
            <Text className="text-[16px] font-medium" style={{ color: colors.action }}>
              Cancel
            </Text>
          </Pressable>
          <Text className="flex-1 text-center text-[17px] font-semibold text-[#1C1C1E]">
            Record Shift
          </Text>
          <View className="w-[52px]" />
        </View>
        <Text className="text-center text-[13px] text-[#8E8E93]">{dateLabel}</Text>
      </View>

      <View className="gap-4 p-5">
        <View className="gap-2">
          <Text className="text-[12px] font-semibold uppercase text-[#8E8E93]">
            Restaurant <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <View
            className="h-11 flex-row items-center rounded-lg px-3"
            style={{ borderWidth: 1.5, borderColor: colors.danger }}>
            <Text className="flex-1 text-[15px] text-[#8E8E93]">No restaurant added</Text>
            <SymbolView
              name="chevron.down"
              size={16}
              tintColor="#8E8E93"
              fallback={<Text className="text-[#8E8E93]">⌄</Text>}
            />
          </View>
          <Pressable accessibilityRole="button" onPress={onAddRestaurant}>
            <Text className="text-[15px] font-semibold" style={{ color: colors.action }}>
              + Add Restaurant
            </Text>
          </Pressable>
        </View>

        <View className="flex-row gap-2.5 rounded-[10px] p-3.5" style={{ backgroundColor: "#EBF5FF" }}>
          <SymbolView
            name="info.circle"
            size={18}
            tintColor={colors.action}
            fallback={<Text style={{ color: colors.action }}>i</Text>}
          />
          <Text className="flex-1 text-[13px] font-medium leading-[18px]" style={{ color: colors.action }}>
            Add a restaurant to start tracking. You only need a name — salary and tip-out rules can be
            set up later.
          </Text>
        </View>

        <View className="opacity-50">
          <Text className="mb-1.5 text-[12px] font-semibold uppercase text-[#8E8E93]">Hours worked</Text>
          <View className="h-11 justify-center rounded-lg px-3" style={{ backgroundColor: colors.parchment }}>
            <Text className="text-[15px] text-[#AEAEB2]">e.g. 6.5</Text>
          </View>
        </View>
      </View>

      <View className="mt-auto px-5 py-3">
        <PrimaryButton label="Save Shift" disabled onPress={() => undefined} />
      </View>
    </SafeAreaView>
  )
}
