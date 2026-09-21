import { useNavigation } from "expo-router"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ActionSheetIOS,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { SymbolView } from "expo-symbols"

import { SegmentedControl } from "@/components/SegmentedControl"
import { HintToast } from "@/components/HintToast"
import {
  addDays,
  isFutureLocalDate,
  parseLocalDate,
  startOfWeek,
  toLocalDate,
} from "@/domain/calendar"
import { formatUsd } from "@/domain/money"
import { requestOpenDate } from "@/features/calendar/openDateRequest"
import { FUTURE_SHIFT_HINT, warnFutureDate } from "@/features/calendar/futureDate"
import {
  monthRangeLabel,
  summarizeStats,
  weekRangeLabel,
  type DailyPoint,
  type StatsMode,
} from "@/features/stats/statsSummary"
import { useAppState } from "@/state/AppStateContext"
import { colors } from "@/theme/colors"

const HINT_MS = 2500

const MODE_OPTIONS: { value: StatsMode; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
]

function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

function formatBestDay(summary: ReturnType<typeof summarizeStats>): string {
  if (!summary.bestDay) {
    return "—"
  }
  return `${monthTick(summary.bestDay.localDate)} · ${formatUsd(summary.bestDay.netCents)}`
}

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export function StatsScreen() {
  const { state } = useAppState()
  const navigation = useNavigation()
  const today = toLocalDate(new Date())
  const weekStartsOn = state.preferences.weekStartsOn
  const [mode, setMode] = useState<StatsMode>("week")
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today, weekStartsOn))
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [restaurantId, setRestaurantId] = useState<string | undefined>(undefined)
  const [futureHint, setFutureHint] = useState(false)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (hintTimer.current) {
        clearTimeout(hintTimer.current)
      }
    }
  }, [])

  const alignedWeekStart = startOfWeek(weekStart, weekStartsOn)
  const summary = useMemo(
    () =>
      summarizeStats({
        shifts: state.shifts,
        restaurants: state.restaurants,
        mode,
        weekStart: alignedWeekStart,
        year,
        month,
        restaurantId,
        weekStartsOn,
      }),
    [state.shifts, state.restaurants, mode, alignedWeekStart, year, month, restaurantId, weekStartsOn],
  )

  const restaurantLabel =
    state.restaurants.find((item) => item.id === restaurantId)?.name ?? "All Restaurants"
  const rangeLabel =
    mode === "week"
      ? weekRangeLabel(alignedWeekStart, weekStartsOn)
      : monthRangeLabel(year, month)

  function changeRange(delta: number) {
    if (mode === "week") {
      setWeekStart(addDays(alignedWeekStart, delta * 7))
      return
    }
    const next = shiftMonth(year, month, delta)
    setYear(next.year)
    setMonth(next.month)
  }

  function showFutureHint() {
    void warnFutureDate()
    setFutureHint(true)
    if (hintTimer.current) {
      clearTimeout(hintTimer.current)
    }
    hintTimer.current = setTimeout(() => {
      setFutureHint(false)
      hintTimer.current = null
    }, HINT_MS)
  }

  function goToCalendar(localDate: string) {
    if (isFutureLocalDate(localDate, today)) {
      showFutureHint()
      return
    }
    requestOpenDate(localDate)
    navigation.navigate("index" as never)
  }

  function pickRestaurant() {
    const options = ["All Restaurants", ...state.restaurants.map((item) => item.name), "Cancel"]
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
      },
      (index) => {
        if (index === 0) {
          setRestaurantId(undefined)
          return
        }
        const restaurant = state.restaurants[index - 1]
        if (restaurant) {
          setRestaurantId(restaurant.id)
        }
      },
    )
  }

  const cards = [
    { label: "Net Income", value: formatUsd(summary.netIncomeCents), tone: "income" as const },
    { label: "Total Tips", value: formatUsd(summary.totalTipsCents) },
    {
      label: "Tip-out",
      value: summary.tipOutCents > 0 ? `-${formatUsd(summary.tipOutCents)}` : formatUsd(0),
      tone: "deduct" as const,
    },
    {
      label: "Average Hourly",
      value: summary.averageHourlyCents === null ? "—" : `${formatUsd(summary.averageHourlyCents)}/hr`,
    },
    { label: "Shifts Worked", value: String(summary.shiftsWorked) },
    { label: "Hours Worked", value: `${formatHours(summary.hoursWorked)} hrs` },
    { label: "Best Day", value: formatBestDay(summary), tone: "income" as const },
  ]

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="relative flex-1">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 96 }}>
        <View className="px-5 pb-3 pt-4">
          <Text className="text-[32px] font-bold text-[#1C1C1E]">Stats</Text>
        </View>

        <View className="gap-3 px-5">
          <SegmentedControl
            options={MODE_OPTIONS}
            value={mode}
            variant="action"
            onChange={setMode}
          />

          <View className="flex-row items-center justify-between py-1">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous range"
              hitSlop={12}
              onPress={() => changeRange(-1)}>
              <SymbolView
                name="chevron.left"
                size={20}
                tintColor={colors.ink}
                fallback={<Text className="text-[20px] text-[#1C1C1E]">‹</Text>}
              />
            </Pressable>
            <Text className="text-[17px] font-semibold text-[#1C1C1E]">{rangeLabel}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next range"
              hitSlop={12}
              onPress={() => changeRange(1)}>
              <SymbolView
                name="chevron.right"
                size={20}
                tintColor={colors.ink}
                fallback={<Text className="text-[20px] text-[#1C1C1E]">›</Text>}
              />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter restaurant"
            className="h-11 flex-row items-center justify-between rounded-[10px] px-3.5"
            style={{ backgroundColor: colors.parchment }}
            onPress={pickRestaurant}>
            <Text className="text-[15px] text-[#1C1C1E]">{restaurantLabel}</Text>
            <SymbolView
              name="chevron.down"
              size={14}
              tintColor="#8E8E93"
              fallback={<Text className="text-[15px] text-[#8E8E93]">▾</Text>}
            />
          </Pressable>

          <View className="flex-row flex-wrap gap-2">
            {cards.map((card) => (
              <View
                key={card.label}
                accessible
                accessibilityLabel={`${card.label} ${card.value}`}
                className="min-h-[72px] gap-0.5 rounded-xl px-3 py-3"
                style={{
                  backgroundColor: colors.parchment,
                  width: card.label === "Net Income" ? "100%" : "48%",
                  flexGrow: 1,
                }}>
                <Text className="text-[11px] font-medium text-[#8E8E93]">{card.label}</Text>
                <Text
                  className="text-[20px] font-bold"
                  style={{
                    color:
                      card.tone === "income"
                        ? colors.income
                        : card.tone === "deduct"
                          ? colors.danger
                          : "#1C1C1E",
                  }}>
                  {card.value}
                </Text>
              </View>
            ))}
          </View>

          <DailyEarnings days={summary.days} mode={mode} onSelect={goToCalendar} />
        </View>
      </ScrollView>
        {futureHint ? <HintToast message={FUTURE_SHIFT_HINT} /> : null}
      </View>
    </SafeAreaView>
  )
}

function monthTick(localDate?: string): string {
  if (!localDate) {
    return ""
  }
  return parseLocalDate(localDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function DailyEarnings({
  days,
  mode,
  onSelect,
}: {
  days: DailyPoint[]
  mode: StatsMode
  onSelect: (localDate: string) => void
}) {
  const max = Math.max(1, ...days.map((day) => day.netCents))

  return (
    <View className="rounded-xl px-3 py-4" style={{ backgroundColor: colors.parchment }}>
      <Text className="mb-3 text-[15px] font-semibold text-[#1C1C1E]">Daily Earnings</Text>
      <View className="h-28 flex-row items-end gap-[3px]">
        {days.map((day) => {
          const height = day.netCents > 0 ? Math.max(6, Math.round((day.netCents / max) * 104)) : 4
          return (
            <Pressable
              key={day.localDate}
              accessibilityRole="button"
              accessibilityLabel={`${parseLocalDate(day.localDate).toDateString()} ${formatUsd(day.netCents)}`}
              className="flex-1 items-center justify-end"
              onPress={() => onSelect(day.localDate)}>
              <View
                className="w-full rounded-sm"
                style={{
                  height,
                  backgroundColor: day.netCents > 0 ? colors.action : "#C7C7CC",
                }}
              />
            </Pressable>
          )
        })}
      </View>
      {mode === "week" ? (
        <View className="mt-2 flex-row gap-[3px]">
          {days.map((day) => {
            const [weekday, dayNumber] = day.label.split(" ")
            return (
              <View key={`${day.localDate}-label`} className="flex-1 items-center">
                <Text className="text-[10px] text-[#8E8E93]">{weekday}</Text>
                <Text className="text-[10px] text-[#8E8E93]">{dayNumber}</Text>
              </View>
            )
          })}
        </View>
      ) : (
        <View className="mt-2 flex-row justify-between">
          <Text className="text-[10px] text-[#8E8E93]">{monthTick(days[0]?.localDate)}</Text>
          <Text className="text-[10px] text-[#8E8E93]">
            {monthTick(days[Math.floor((days.length - 1) / 2)]?.localDate)}
          </Text>
          <Text className="text-[10px] text-[#8E8E93]">
            {monthTick(days[days.length - 1]?.localDate)}
          </Text>
        </View>
      )}
    </View>
  )
}
