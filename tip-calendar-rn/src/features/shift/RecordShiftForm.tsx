import { useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { PrimaryButton } from "@/components/PrimaryButton"
import { TextField } from "@/components/TextField"
import { parseLocalDate } from "@/domain/calendar"
import { centsToDollars, dollarsToCents, formatUsd } from "@/domain/money"
import type { Restaurant } from "@/domain/restaurant"
import { colors } from "@/theme/colors"

import { canSaveShift, previewShiftIncome, type ShiftDraft } from "./shiftDraft"

type RecordShiftFormProps = {
  localDate: string
  restaurant: Restaurant
  mode?: "create" | "edit"
  initialDraft?: ShiftDraft
  saving?: boolean
  onCancel: () => void
  onSave: (draft: ShiftDraft) => Promise<void>
}

function formatShiftDateTitle(localDate: string, weekday: "short" | "long"): string {
  return parseLocalDate(localDate).toLocaleDateString("en-US", {
    weekday,
    month: "long",
    day: "numeric",
  })
}

function hoursToField(hours: number): string {
  return hours > 0 ? String(hours) : ""
}

function centsToField(cents: number): string {
  return cents > 0 ? String(centsToDollars(cents)) : ""
}

function parseHours(value: string): number {
  const amount = Number(value.trim())
  return Number.isFinite(amount) && amount >= 0 ? amount : 0
}

function parseMoney(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) {
    return 0
  }
  const amount = Number(trimmed)
  if (!Number.isFinite(amount) || amount < 0) {
    return 0
  }
  return dollarsToCents(amount)
}

export function RecordShiftForm({
  localDate,
  restaurant,
  mode = "create",
  initialDraft,
  saving = false,
  onCancel,
  onSave,
}: RecordShiftFormProps) {
  const [hoursText, setHoursText] = useState(() => hoursToField(initialDraft?.hours ?? 0))
  const [cashText, setCashText] = useState(() => centsToField(initialDraft?.cashTipsCents ?? 0))
  const [cardText, setCardText] = useState(() => centsToField(initialDraft?.cardTipsCents ?? 0))
  const isEdit = mode === "edit"

  const draft: ShiftDraft = {
    localDate,
    restaurantId: restaurant.id,
    hours: parseHours(hoursText),
    cashTipsCents: parseMoney(cashText),
    cardTipsCents: parseMoney(cardText),
  }
  const income = previewShiftIncome(draft, restaurant)
  const canSave = canSaveShift(draft) && !saving

  const hourlyLabel =
    income.effectiveHourlyCents === null ? "—" : `${formatUsd(income.effectiveHourlyCents)}/hr`
  const tipOutLabel =
    income.tipOutCents > 0 ? `-${formatUsd(income.tipOutCents)}` : formatUsd(0)

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-row items-center border-b border-[#E5E5EA] px-5 py-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            className="min-h-[44px] w-[52px] justify-center"
            onPress={onCancel}>
            <Text className="text-[16px] font-medium" style={{ color: colors.action }}>
              Cancel
            </Text>
          </Pressable>
          <View className="flex-1 items-center">
            <Text className="text-center text-[17px] font-semibold text-[#1C1C1E]">
              {isEdit ? "Edit Shift" : formatShiftDateTitle(localDate, "short")}
            </Text>
            {isEdit ? (
              <Text className="text-center text-[13px] text-[#8E8E93]">
                {formatShiftDateTitle(localDate, "long")}
              </Text>
            ) : null}
          </View>
          <View className="w-[52px]" />
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ gap: 16, padding: 20 }}>
          <View className="gap-1.5">
            <Text className="text-[12px] font-semibold uppercase text-[#8E8E93]">Restaurant</Text>
            <View
              className="h-11 justify-center rounded-lg border border-[#E5E5EA] px-3"
              style={{ backgroundColor: colors.parchment }}>
              <Text className="text-[15px] text-[#1C1C1E]">{restaurant.name}</Text>
            </View>
          </View>

          <TextField
            label="Hours worked"
            keyboardType="decimal-pad"
            placeholder="0"
            value={hoursText}
            variant="outline"
            onChangeText={setHoursText}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField
                label="Cash Tips"
                prefix="$"
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={cashText}
                variant="outline"
                onChangeText={setCashText}
              />
            </View>
            <View className="flex-1">
              <TextField
                label="Card Tips"
                prefix="$"
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={cardText}
                variant="outline"
                onChangeText={setCardText}
              />
            </View>
          </View>

          <View className="gap-3 rounded-xl p-4" style={{ backgroundColor: colors.parchment }}>
            <Text className="text-[12px] font-semibold uppercase text-[#8E8E93]">Results</Text>
            <ResultRow label="Total Tips" value={formatUsd(income.totalTipsCents)} />
            <ResultRow label="Wages" value={formatUsd(income.wageIncomeCents)} />
            <ResultRow label="Tip-out" value={tipOutLabel} />
            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-[14px] text-[#8E8E93]">Net Income</Text>
                <Text className="text-[28px] font-bold" style={{ color: colors.income }}>
                  {formatUsd(income.netIncomeCents)}
                </Text>
              </View>
              <Text className="text-[12px] text-[#8E8E93]">
                Net income ≠ cash received this shift
              </Text>
            </View>
            <ResultRow label="Actual Hourly" value={hourlyLabel} />
          </View>
        </ScrollView>

        <View className="px-5 pb-2 pt-3">
          <PrimaryButton
            label={isEdit ? "Save Changes" : "Save Shift"}
            disabled={!canSave}
            onPress={() => {
              void onSave(draft)
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-[14px] text-[#8E8E93]">{label}</Text>
      <Text className="text-[14px] font-semibold text-[#1C1C1E]">{value}</Text>
    </View>
  )
}
