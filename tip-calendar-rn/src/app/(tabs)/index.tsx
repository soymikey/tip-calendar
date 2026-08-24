import { router } from "expo-router"
import { useMemo, useState } from "react"
import { Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { CalendarMonth, defaultSelectedDate } from "@/features/calendar/CalendarMonth"
import { summarizeCalendar } from "@/features/calendar/calendarSummary"
import { EmptyShiftOverlay } from "@/features/calendar/EmptyShiftOverlay"
import { formatUsd } from "@/domain/money"
import { toLocalDate } from "@/domain/calendar"
import { useAppState } from "@/state/AppStateContext"
import { colors } from "@/theme/colors"

export default function CalendarScreen() {
  const { state } = useAppState()
  const now = new Date()
  const today = toLocalDate(new Date())
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedLocalDate, setSelectedLocalDate] = useState(() =>
    defaultSelectedDate(now.getFullYear(), now.getMonth() + 1, now),
  )
  const [showEmptyHint, setShowEmptyHint] = useState(true)
  const hasShifts = state.shifts.length > 0
  const showOverlay = !hasShifts && showEmptyHint

  const summary = useMemo(
    () =>
      summarizeCalendar({
        shifts: state.shifts,
        restaurants: state.restaurants,
        today,
        year,
        month,
        weekStartsOn: state.preferences.weekStartsOn,
      }),
    [state.shifts, state.restaurants, state.preferences.weekStartsOn, today, year, month],
  )

  function changeMonth(nextYear: number, nextMonth: number) {
    setYear(nextYear)
    setMonth(nextMonth)
    setSelectedLocalDate(defaultSelectedDate(nextYear, nextMonth))
  }

  function selectDate(localDate: string) {
    setShowEmptyHint(false)
    setSelectedLocalDate(localDate)
    router.push({ pathname: "/shift/new", params: { date: localDate } })
  }

  const cards = [
    {
      label: "This Week",
      value: hasShifts ? formatUsd(summary.weekCents) : "—",
    },
    {
      label: "This Month",
      value: hasShifts ? formatUsd(summary.monthCents) : "—",
    },
    {
      label: "Hourly",
      value: summary.hourlyCents === null ? "—" : `${formatUsd(summary.hourlyCents)}/hr`,
    },
  ]

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="px-5 pb-3 pt-4">
        <Text className="text-[32px] font-bold text-[#1C1C1E]">Tip Calendar</Text>
      </View>

      <CalendarMonth
        year={year}
        month={month}
        selectedLocalDate={selectedLocalDate}
        amountsByDate={summary.byDate}
        faded={showOverlay}
        overlay={
          showOverlay ? <EmptyShiftOverlay onDismiss={() => setShowEmptyHint(false)} /> : null
        }
        belowHeader={
          <View className="flex-row gap-2 px-5 py-1">
            {cards.map((card) => (
              <View
                key={card.label}
                className="flex-1 gap-0.5 rounded-xl px-2.5 py-3"
                style={{ backgroundColor: colors.parchment }}>
                <Text className="text-[11px] font-medium text-[#8E8E93]">{card.label}</Text>
                <Text className="text-[17px] font-bold text-[#1C1C1E]">{card.value}</Text>
              </View>
            ))}
          </View>
        }
        onSelectDate={selectDate}
        onChangeMonth={changeMonth}
      />
    </SafeAreaView>
  )
}
