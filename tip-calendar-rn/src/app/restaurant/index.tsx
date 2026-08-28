import { router } from "expo-router"
import { Pressable, ScrollView, Text } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { SettingsGroup, SettingsRow } from "@/components/SettingsRow"
import { StackHeader } from "@/components/StackHeader"
import { paySummary } from "@/features/restaurant/restaurantList"
import { useAppState } from "@/state/AppStateContext"
import { colors } from "@/theme/colors"

export default function RestaurantSettingsScreen() {
  const { state } = useAppState()
  const defaultRestaurantId = state.preferences.defaultRestaurantId
  const restaurants = [...state.restaurants].sort((left, right) => {
    const leftDefault = left.id === defaultRestaurantId
    const rightDefault = right.id === defaultRestaurantId
    if (leftDefault === rightDefault) {
      return left.name.localeCompare(right.name)
    }
    return leftDefault ? -1 : 1
  })

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StackHeader title="Restaurants" />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        <SettingsGroup>
          {restaurants.map((restaurant) => (
            <SettingsRow
              key={restaurant.id}
              title={restaurant.name}
              subtitle={`${paySummary(restaurant)}${restaurant.id === defaultRestaurantId ? " · Default" : ""}`}
              onPress={() =>
                router.push({ pathname: "/restaurant/[id]", params: { id: restaurant.id } })
              }
            />
          ))}
        </SettingsGroup>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add restaurant"
          className="min-h-[44px] items-center justify-center"
          onPress={() => router.push({ pathname: "/restaurant/[id]", params: { id: "new" } })}>
          <Text className="text-[17px] font-semibold" style={{ color: colors.action }}>
            + Add Restaurant
          </Text>
        </Pressable>
        {restaurants.length === 0 ? (
          <Text className="text-center text-[15px] text-[#8E8E93]">
            Add a restaurant before recording a shift.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
