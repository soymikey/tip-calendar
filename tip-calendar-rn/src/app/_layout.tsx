import { useEffect } from "react"
import { Stack, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { Modal, Pressable, Text, View } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { shouldShowAnalyticsPrompt } from "@/features/analytics/consentPrompt"
import { configureNativeAnalytics } from "@/features/analytics/track"
import { AdProvider } from "@/features/ads/AdProvider"
import { AppStateProvider, useAppState } from "@/state/AppStateContext"
import { needsOnboarding } from "@/state/session"

import "../global.css"

export default function RootLayout() {
  return (
    <AppStateProvider>
      <SafeAreaProvider>
        <AdProvider>
          <StatusBar style="dark" />
          <RootStack />
          <AnalyticsConfiguration />
        </AdProvider>
      </SafeAreaProvider>
    </AppStateProvider>
  )
}

function AnalyticsConfiguration() {
  const { ready, state, startedOnboarding, updateState } = useAppState()
  const segments = useSegments()
  const consent = state.preferences.analyticsConsent

  useEffect(() => {
    if (ready) {
      void configureNativeAnalytics(consent === true)
    }
  }, [consent, ready])

  async function choose(value: boolean) {
    await updateState((current) => ({
      ...current,
      preferences: { ...current.preferences, analyticsConsent: value },
    }))
  }

  const showPrompt =
    ready &&
    shouldShowAnalyticsPrompt(
      startedOnboarding,
      !needsOnboarding(state),
      segments[0] === "(tabs)",
      consent,
    )

  return (
    <Modal visible={showPrompt} transparent animationType="fade" onRequestClose={() => void choose(false)}>
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <View className="w-full max-w-md gap-4 rounded-lg bg-white p-6">
          <Text className="text-[22px] font-bold text-[#1C1C1E]">Help improve Tip Calendar?</Text>
          <Text className="text-[16px] leading-6 text-[#3A3A3C]">
            Share anonymous usage counts and crash reports to help us improve the app. We do not
            include your tips, restaurant names, shift dates, or notes. You can change this anytime
            in Preferences.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="min-h-[48px] items-center justify-center rounded-lg bg-[#0066CC]"
            onPress={() => void choose(true)}>
            <Text className="text-[17px] font-semibold text-white">Share analytics</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="min-h-[44px] items-center justify-center"
            onPress={() => void choose(false)}>
            <Text className="text-[17px] font-medium text-[#0066CC]">Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
      <Stack.Screen name="restaurant/index" />
      <Stack.Screen name="restaurant/[id]" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="data-backup" />
      <Stack.Screen name="about-privacy" />
    </Stack>
  )
}
