import { useState } from "react"
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"

import { PrimaryButton } from "@/components/PrimaryButton"
import { StackHeader } from "@/components/StackHeader"
import { TextField } from "@/components/TextField"
import { createRestaurant } from "@/domain/restaurant"
import { StepBasePay } from "@/features/onboarding/StepBasePay"
import { StepTipOut } from "@/features/onboarding/StepTipOut"
import type { OnboardingDraft } from "@/features/onboarding/onboardingDraft"
import { removeRestaurant, upsertRestaurant } from "@/features/restaurant/restaurantList"
import { useAppState } from "@/state/AppStateContext"
import { colors } from "@/theme/colors"

function draftFromRestaurant(name: string, restaurant?: ReturnType<typeof createRestaurant>): OnboardingDraft {
  return {
    step: 1,
    name,
    payType: restaurant?.payType ?? "none",
    payAmountCents: restaurant?.payAmountCents ?? 0,
    tipOutRule: restaurant?.defaultTipOutRule ?? { type: "none" },
  }
}

export default function RestaurantEditorScreen() {
  const { state, updateState } = useAppState()
  const rawId = useLocalSearchParams<{ id?: string | string[] }>().id
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  const isNew = id === "new" || !id
  const existing = isNew ? undefined : state.restaurants.find((item) => item.id === id)
  const [draft, setDraft] = useState(() => draftFromRestaurant(existing?.name ?? "", existing))
  const [isDefault, setIsDefault] = useState(
    () => existing?.isDefault ?? state.restaurants.length === 0,
  )
  const [saving, setSaving] = useState(false)
  const canSave = draft.name.trim().length > 0

  async function save() {
    if (!canSave || saving) {
      return
    }
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const restaurant = existing
        ? {
            ...existing,
            name: draft.name.trim(),
            isDefault,
            payType: draft.payType,
            payAmountCents: draft.payAmountCents,
            defaultTipOutRule: draft.tipOutRule,
            updatedAt: now,
          }
        : createRestaurant({
            name: draft.name.trim(),
            isDefault,
            payType: draft.payType,
            payAmountCents: draft.payAmountCents,
            defaultTipOutRule: draft.tipOutRule,
            now,
          })
      await updateState((current) => ({
        ...current,
        restaurants: upsertRestaurant(current.restaurants, restaurant),
      }))
      router.back()
    } finally {
      setSaving(false)
    }
  }

  function requestDelete() {
    if (!existing) {
      return
    }
    const last = state.restaurants.length === 1
    Alert.alert(
      "Delete restaurant?",
      last
        ? "This is your only restaurant. You'll need to add one before recording a shift."
        : "Existing shifts stay on the calendar. They won't use this restaurant's pay settings anymore.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void confirmDelete()
          },
        },
      ],
    )
  }

  async function confirmDelete() {
    if (!existing) {
      return
    }
    await updateState((current) => ({
      ...current,
      restaurants: removeRestaurant(current.restaurants, existing.id),
    }))
    router.back()
  }

  if (!isNew && !existing) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <StackHeader title="Restaurant" backLabel="Restaurants" />
        <Text className="px-5 pt-6 text-[15px] text-[#8E8E93]">This restaurant was deleted.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StackHeader title={isNew ? "Add Restaurant" : "Edit Restaurant"} backLabel="Restaurants" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}>
          <TextField
            label="Restaurant name"
            placeholder="e.g., The Olive Garden"
            value={draft.name}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
          />
          <View className="h-11 flex-row items-center justify-between">
            <Text className="text-[17px] text-[#1C1C1E]">Default restaurant</Text>
            <Switch
              value={isDefault}
              onValueChange={setIsDefault}
              trackColor={{ true: colors.action }}
            />
          </View>
          <StepBasePay
            draft={draft}
            onChangePay={(payType, payAmountCents) =>
              setDraft((current) => ({ ...current, payType, payAmountCents }))
            }
          />
          <StepTipOut
            draft={draft}
            onChangeRule={(tipOutRule) => setDraft((current) => ({ ...current, tipOutRule }))}
          />
          <PrimaryButton
            label={saving ? "Saving…" : "Save"}
            disabled={!canSave || saving}
            onPress={() => {
              void save()
            }}
          />
          {existing ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete restaurant"
              className="min-h-[44px] items-center justify-center"
              onPress={requestDelete}>
              <Text className="text-[17px] font-semibold" style={{ color: colors.danger }}>
                Delete Restaurant
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
