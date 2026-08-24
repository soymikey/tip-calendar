import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { AppStateProvider, useAppState } from "@/state/AppStateContext"
import { needsOnboarding } from "@/state/session"

import "../global.css"

export default function RootLayout() {
  return (
    <AppStateProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <RootStack />
      </SafeAreaProvider>
    </AppStateProvider>
  )
}

function RootStack() {
  const { ready, state } = useAppState()
  if (!ready) {
    return null
  }

  return (
    <Stack
      screenOptions={{ headerShown: false }}
      initialRouteName={needsOnboarding(state) ? "onboarding/index" : "(tabs)"}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding/index" />
      <Stack.Screen name="shift/new" />
      <Stack.Screen name="shift/[id]" />
    </Stack>
  )
}
