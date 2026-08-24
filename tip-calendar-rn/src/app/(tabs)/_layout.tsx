import { Redirect, Tabs } from "expo-router"
import { SymbolView } from "expo-symbols"
import { View, type ColorValue } from "react-native"

import { useAppState } from "@/state/AppStateContext"
import { needsOnboarding } from "@/state/session"
import { colors } from "@/theme/colors"

function TabIcon({
  name,
  color,
}: {
  name: "calendar" | "chart.bar" | "person.fill"
  color: ColorValue
}) {
  const tint = typeof color === "string" ? color : colors.action
  return (
    <SymbolView
      name={name}
      tintColor={tint}
      size={24}
      fallback={<View className="h-6 w-6 rounded-sm" style={{ backgroundColor: tint }} />}
    />
  )
}

export default function TabLayout() {
  const { state } = useAppState()
  if (needsOnboarding(state)) {
    return <Redirect href="/onboarding" />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.action,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.canvas },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Calendar",
          tabBarAccessibilityLabel: "Calendar",
          tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarAccessibilityLabel: "Stats",
          tabBarIcon: ({ color }) => <TabIcon name="chart.bar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Me",
          tabBarAccessibilityLabel: "Me",
          tabBarIcon: ({ color }) => <TabIcon name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  )
}
