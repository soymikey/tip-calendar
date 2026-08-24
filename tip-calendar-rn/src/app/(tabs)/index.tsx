import { useState } from "react"
import { Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { CalendarMonth, defaultSelectedDate } from "@/features/calendar/CalendarMonth"
import { EmptyShiftOverlay } from "@/features/calendar/EmptyShiftOverlay"
import { colors } from "@/theme/colors"

const SUMMARY_CARDS = ["This Week", "This Month", "Hourly"] as const

export default function CalendarScreen() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedLocalDate, setSelectedLocalDate] = useState(() =>
    defaultSelectedDate(now.getFullYear(), now.getMonth() + 1, now),
  )

  function changeMonth(nextYear: number, nextMonth: number) {
    setYear(nextYear)
    setMonth(nextMonth)
    setSelectedLocalDate(defaultSelectedDate(nextYear, nextMonth))
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="px-5 pb-3 pt-4">
        <Text className="text-[32px] font-bold text-[#1C1C1E]">Tip Calendar</Text>
      </View>

      <CalendarMonth
        year={year}
        month={month}
        selectedLocalDate={selectedLocalDate}
        faded
        overlay={<EmptyShiftOverlay />}
        belowHeader={
          <View className="flex-row gap-2 px-5 py-1">
            {SUMMARY_CARDS.map((label) => (
              <View
                key={label}
                className="flex-1 gap-0.5 rounded-xl px-2.5 py-3"
                style={{ backgroundColor: colors.parchment }}>
                <Text className="text-[11px] font-medium text-[#8E8E93]">{label}</Text>
                <Text className="text-[17px] font-bold text-[#1C1C1E]">—</Text>
              </View>
            ))}
          </View>
        }
        onSelectDate={setSelectedLocalDate}
        onChangeMonth={changeMonth}
      />
    </SafeAreaView>
  )
}
