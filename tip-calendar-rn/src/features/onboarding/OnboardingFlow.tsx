import { useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { SymbolView } from "expo-symbols"

import { PrimaryButton } from "@/components/PrimaryButton"
import { useAppState } from "@/state/AppStateContext"
import { colors } from "@/theme/colors"

import { StepBasePay } from "./StepBasePay"
import { StepRestaurant } from "./StepRestaurant"
import { StepTipOut } from "./StepTipOut"
import {
  canContinueStep,
  completeOnboarding,
  reduceOnboarding,
  type OnboardingAction,
  type OnboardingDraft,
} from "./onboardingDraft"

const TITLES: Record<1 | 2 | 3, { title: string; subtitle: string }> = {
  1: {
    title: "Name your restaurant",
    subtitle: "Add your first restaurant to start tracking tips.",
  },
  2: {
    title: "Set your base pay",
    subtitle: "How are you paid before tips?",
  },
  3: {
    title: "Tip-out rule",
    subtitle: "Do you share a portion of your tips?",
  },
}

export function OnboardingFlow() {
  const { updateState } = useAppState()
  const [draft, setDraft] = useState(() => reduceOnboarding(undefined, { type: "init" }))
  const [saving, setSaving] = useState(false)
  const copy = TITLES[draft.step]
  const canContinue = canContinueStep(draft)

  function dispatch(action: OnboardingAction) {
    setDraft((current) => reduceOnboarding(current, action))
  }

  async function saveRestaurant(next: OnboardingDraft) {
    if (saving) {
      return
    }
    setSaving(true)
    try {
      const restaurant = completeOnboarding(next, new Date().toISOString())
      await updateState((current) => ({
        ...current,
        restaurants: [restaurant],
        preferences: { ...current.preferences, defaultRestaurantId: restaurant.id },
      }))
    } finally {
      setSaving(false)
    }
  }

  async function onPrimary() {
    if (!canContinue || saving) {
      return
    }
    if (draft.step < 3) {
      dispatch({ type: "next" })
      return
    }
    await saveRestaurant(draft)
  }

  async function onSkip() {
    if (saving) {
      return
    }
    const next = reduceOnboarding(draft, { type: "skip" })
    setDraft(next)
    await saveRestaurant(next)
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-row items-center justify-between px-6 pt-3">
          {draft.step > 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              className="min-h-[44px] flex-row items-center"
              onPress={() => dispatch({ type: "back" })}>
              <SymbolView
                name="chevron.left"
                size={18}
                tintColor={colors.action}
                fallback={<View className="h-[20px] w-3" />}
              />
              <Text className="text-[17px]" style={{ color: colors.action }}>
                Back
              </Text>
            </Pressable>
          ) : (
            <View className="h-5 w-10" />
          )}
          <Text className="text-[15px] font-semibold text-[#8E8E93]">Step {draft.step} of 3</Text>
          <View className="h-5 w-10" />
        </View>

        <View className="gap-3 px-6 pb-6 pt-5">
          <Text className="text-[34px] font-extrabold leading-10 text-[#1C1C1E]">{copy.title}</Text>
          <Text className="text-[17px] leading-[22px] text-[#8E8E93]">{copy.subtitle}</Text>
        </View>

        <View className="px-6">
          {draft.step === 1 ? (
            <StepRestaurant
              draft={draft}
              onChangeName={(name) => dispatch({ type: "setName", name })}
            />
          ) : null}
          {draft.step === 2 ? (
            <StepBasePay
              draft={draft}
              onChangePay={(payType, payAmountCents) =>
                dispatch({ type: "setPay", payType, payAmountCents })
              }
            />
          ) : null}
          {draft.step === 3 ? (
            <StepTipOut
              draft={draft}
              onChangeRule={(rule) => dispatch({ type: "setTipOut", rule })}
            />
          ) : null}
        </View>

        <View className="flex-1" />

        <View className="items-center gap-4 px-6 pb-2 pt-4">
          <PrimaryButton
            label={draft.step === 3 ? "Get Started" : "Next"}
            disabled={!canContinue || saving}
            onPress={() => {
              void onPrimary()
            }}
          />
          <Pressable
            accessibilityRole="button"
            className="min-h-[44px] items-center justify-center"
            disabled={saving}
            onPress={() => {
              void onSkip()
            }}>
            <Text className="text-center text-[15px] font-medium" style={{ color: colors.action }}>
              Skip for now
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
