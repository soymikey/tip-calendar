import { useMemo, useRef } from "react"
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { SymbolView } from "expo-symbols"

import { parseLocalDate } from "@/domain/calendar"
import { formatUsd } from "@/domain/money"
import type { Restaurant } from "@/domain/restaurant"
import { calculateShiftIncome, type Shift } from "@/domain/shift"
import { colors } from "@/theme/colors"

type DayDetailsSheetProps = {
  localDate: string
  shifts: Shift[]
  restaurants: Restaurant[]
  timeFormat: "12h" | "24h"
  onClose: () => void
  onAdd: () => void
  onEdit: (shiftId: string) => void
  onDelete: (shift: Shift) => void
}

export function formatLongShiftDate(localDate: string): string {
  return parseLocalDate(localDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function shiftCardTitle(shift: Shift): string {
  if (shift.tag === "lunch") {
    return "Lunch Shift"
  }
  if (shift.tag === "dinner") {
    return "Dinner Shift"
  }
  return "Shift"
}

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : String(hours)
}

function formatClock(hhmm: string, timeFormat: "12h" | "24h"): string {
  const [hoursText, minutesText] = hhmm.split(":")
  const hours = Number(hoursText)
  const minutes = Number(minutesText)
  if (timeFormat === "24h") {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  }
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function restaurantForShift(shift: Shift, restaurants: Restaurant[]): Restaurant {
  return (
    restaurants.find((item) => item.id === shift.restaurantId) ?? {
      id: shift.restaurantId,
      name: "Unknown restaurant",
      isDefault: false,
      payType: "none",
      payAmountCents: 0,
      creditCardTipPayout: "same_day",
      defaultTipOutRule: { type: "none" },
      createdAt: "",
      updatedAt: "",
    }
  )
}

function incomeForShift(shift: Shift, restaurant: Restaurant) {
  return calculateShiftIncome({
    restaurant,
    hours: shift.hours,
    unpaidBreakHours: shift.unpaidBreakHours,
    cashTipsCents: shift.cashTipsCents,
    cardTipsCents: shift.cardTipsCents,
    otherIncomeCents: shift.otherIncomeCents,
    salesCents: shift.salesCents,
    tipOutOverride: shift.tipOutSnapshot.rule,
  })
}

function wageLabel(shift: Shift, restaurant: Restaurant): string {
  if (restaurant.payType === "hourly" && restaurant.payAmountCents > 0) {
    return `Hourly wages (${formatHours(shift.hours)} hrs × ${formatUsd(restaurant.payAmountCents)}/hr)`
  }
  return "Wages"
}

export function DayDetailsSheet({
  localDate,
  shifts,
  restaurants,
  timeFormat,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}: DayDetailsSheetProps) {
  const { height } = useWindowDimensions()
  const translateY = useRef(new Animated.Value(0)).current
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 8 && gesture.dy > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy)
          }
        },
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy > 80 || gesture.vy > 0.8) {
            translateY.setValue(0)
            onClose()
            return
          }
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start()
        },
      }),
    [onClose, translateY],
  )

  const cards = shifts.map((shift) => {
    const restaurant = restaurantForShift(shift, restaurants)
    return { shift, restaurant, income: incomeForShift(shift, restaurant) }
  })
  const dailyTotal = cards.reduce((sum, card) => sum + card.income.netIncomeCents, 0)

  return (
    <View
      className="absolute inset-0"
      pointerEvents="box-none"
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close day details"
        className="flex-1"
        style={{ backgroundColor: colors.overlay }}
        onPress={onClose}
      />
      <Animated.View
        className="rounded-t-[20px] bg-white"
        style={{
          maxHeight: height * 0.72,
          transform: [{ translateY }],
          shadowColor: "#000000",
          shadowOpacity: 0.18,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
        }}>
        <View {...pan.panHandlers}>
          <View className="items-center py-2">
            <View className="h-1 w-10 rounded-full bg-[#D1D1D6]" />
          </View>
          <View className="flex-row items-center gap-3 px-5 pb-3">
            <Text className="flex-1 text-[22px] font-bold text-[#1C1C1E]">
              {formatLongShiftDate(localDate)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add shift"
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.action }}
              onPress={onAdd}>
              <SymbolView
                name="plus"
                size={18}
                tintColor="#FFFFFF"
                fallback={<Text className="text-[18px] font-semibold text-white">+</Text>}
              />
            </Pressable>
          </View>
        </View>

        <ScrollView
          className="px-5"
          contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled">
          {cards.map(({ shift, restaurant, income }) => (
            <View
              key={shift.id}
              className="gap-3 rounded-xl p-4"
              style={{ backgroundColor: colors.parchment }}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1 gap-0.5 pr-3">
                  <Text className="text-[17px] font-semibold text-[#1C1C1E]">
                    {shiftCardTitle(shift)}
                  </Text>
                  <Text className="text-[14px] text-[#8E8E93]">{restaurant.name}</Text>
                  <Text className="text-[14px] text-[#8E8E93]">{formatHours(shift.hours)} hrs</Text>
                  {shift.clockIn && shift.clockOut ? (
                    <Text className="text-[14px] text-[#8E8E93]">
                      {formatClock(shift.clockIn, timeFormat)} – {formatClock(shift.clockOut, timeFormat)}
                      {shift.overnight ? " · Overnight" : ""}
                    </Text>
                  ) : shift.overnight ? (
                    <Text className="text-[14px] text-[#8E8E93]">Overnight</Text>
                  ) : null}
                </View>
                <View className="flex-row gap-1">
                  <IconButton label="Edit shift" symbol="pencil" onPress={() => onEdit(shift.id)} />
                  <IconButton label="Delete shift" symbol="trash" onPress={() => onDelete(shift)} />
                </View>
              </View>

              <DetailRow label="Cash tips" value={formatUsd(shift.cashTipsCents)} />
              <DetailRow label="Card tips" value={formatUsd(shift.cardTipsCents)} />
              <DetailRow
                label={wageLabel(shift, restaurant)}
                value={formatUsd(income.wageIncomeCents)}
              />
              <DetailRow
                label="Tip-out"
                value={
                  income.tipOutCents > 0 ? `-${formatUsd(income.tipOutCents)}` : formatUsd(0)
                }
              />
              <View className="flex-row items-center justify-between pt-1">
                <Text className="text-[14px] text-[#8E8E93]">Net Income</Text>
                <Text className="text-[20px] font-bold" style={{ color: colors.income }}>
                  {formatUsd(income.netIncomeCents)}
                </Text>
              </View>
            </View>
          ))}

          {cards.length > 1 ? (
            <View
              className="flex-row items-center justify-between rounded-xl px-4 py-3"
              style={{ backgroundColor: "#E5F2FF" }}>
              <Text className="text-[14px] font-semibold" style={{ color: colors.action }}>
                Daily Total Net Income
              </Text>
              <Text className="text-[17px] font-bold" style={{ color: colors.income }}>
                {formatUsd(dailyTotal)}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>
    </View>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text className="flex-1 text-[14px] text-[#8E8E93]">{label}</Text>
      <Text className="text-[14px] font-semibold text-[#1C1C1E]">{value}</Text>
    </View>
  )
}

function IconButton({
  label,
  symbol,
  onPress,
}: {
  label: string
  symbol: "pencil" | "trash"
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-8 w-8 items-center justify-center"
      hitSlop={8}
      onPress={onPress}>
      <SymbolView
        name={symbol}
        size={18}
        tintColor="#8E8E93"
        fallback={<Text className="text-[16px] text-[#8E8E93]">{symbol === "pencil" ? "✎" : "⌫"}</Text>}
      />
    </Pressable>
  )
}
