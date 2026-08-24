import type { ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import { SymbolView } from "expo-symbols"

import { buildMonthGrid, toLocalDate, type LocalDate } from "@/domain/calendar"
import { formatUsd } from "@/domain/money"
import { colors } from "@/theme/colors"

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const

type CalendarMonthProps = {
  year: number
  month: number
  selectedLocalDate: LocalDate
  amountsByDate?: Map<LocalDate, number>
  faded?: boolean
  belowHeader?: ReactNode
  overlay?: ReactNode
  onSelectDate: (localDate: LocalDate) => void
  onChangeMonth: (year: number, month: number) => void
}

function monthTitle(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export function defaultSelectedDate(year: number, month: number, today = new Date()): LocalDate {
  if (today.getFullYear() === year && today.getMonth() + 1 === month) {
    return toLocalDate(today)
  }
  return `${year}-${String(month).padStart(2, "0")}-01`
}

export function CalendarMonth({
  year,
  month,
  selectedLocalDate,
  amountsByDate,
  faded = false,
  belowHeader,
  overlay,
  onSelectDate,
  onChangeMonth,
}: CalendarMonthProps) {
  const grid = buildMonthGrid(year, month, 0)

  function go(delta: number) {
    const next = shiftMonth(year, month, delta)
    onChangeMonth(next.year, next.month)
  }

  return (
    <View className="w-full">
      <View className="flex-row items-center justify-between px-5 py-2">
        <Text className="text-[20px] font-bold text-[#1C1C1E]">{monthTitle(year, month)}</Text>
        <View className="flex-row items-center gap-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            hitSlop={12}
            onPress={() => go(-1)}>
            <SymbolView
              name="chevron.left"
              size={20}
              tintColor={colors.ink}
              fallback={<Text className="text-[20px] text-[#1C1C1E]">‹</Text>}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            hitSlop={12}
            onPress={() => go(1)}>
            <SymbolView
              name="chevron.right"
              size={20}
              tintColor={colors.ink}
              fallback={<Text className="text-[20px] text-[#1C1C1E]">›</Text>}
            />
          </Pressable>
        </View>
      </View>

      {belowHeader}

      <View className="px-5 py-3">
        <View className="flex-row">
          {WEEKDAYS.map((label, index) => (
            <View key={`${label}-${index}`} className="flex-1 items-center py-1">
              <Text className="text-[12px] font-semibold text-[#8E8E93]">{label}</Text>
            </View>
          ))}
        </View>
        <View className="relative">
          <View className="gap-1" style={{ opacity: faded ? 0.15 : 1 }}>
            {grid.map((row, rowIndex) => (
              <View key={rowIndex} className="flex-row">
                {row.map((cell, cellIndex) => {
                  if (!cell) {
                    return <View key={`empty-${rowIndex}-${cellIndex}`} className="h-[52px] flex-1" />
                  }
                  const selected = cell.localDate === selectedLocalDate
                  const amount = amountsByDate?.get(cell.localDate)
                  return (
                    <Pressable
                      key={cell.localDate}
                      accessibilityRole="button"
                      accessibilityLabel={cell.localDate}
                      className="h-[52px] flex-1 items-center justify-center gap-0.5 rounded-lg py-1.5"
                      style={selected ? { backgroundColor: colors.action } : undefined}
                      onPress={() => onSelectDate(cell.localDate)}>
                      <Text
                        className="text-[14px] font-medium"
                        style={{
                          color: selected ? "#FFFFFF" : "#1C1C1E",
                          fontWeight: selected ? "700" : "500",
                        }}>
                        {cell.day}
                      </Text>
                      {amount !== undefined ? (
                        <Text
                          className="text-[11px] font-semibold"
                          style={{ color: selected ? "#FFFFFF" : colors.income }}>
                          {formatUsd(amount, { compact: true })}
                        </Text>
                      ) : null}
                    </Pressable>
                  )
                })}
              </View>
            ))}
          </View>
          {overlay}
        </View>
      </View>
    </View>
  )
}
