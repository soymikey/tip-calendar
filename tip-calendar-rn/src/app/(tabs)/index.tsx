import { router } from "expo-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { Alert, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { CalendarMonth, defaultSelectedDate } from "@/features/calendar/CalendarMonth"
import { DayDetailsSheet } from "@/features/calendar/DayDetailsSheet"
import { summarizeCalendar } from "@/features/calendar/calendarSummary"
import { EmptyShiftOverlay } from "@/features/calendar/EmptyShiftOverlay"
import { UndoToast } from "@/features/calendar/UndoToast"
import { formatUsd } from "@/domain/money"
import { toLocalDate } from "@/domain/calendar"
import type { Shift } from "@/domain/shift"
import {
  insertShiftAt,
  removeShift,
  shiftsOnDate,
} from "@/features/shift/shiftDraft"
import { useAppState } from "@/state/AppStateContext"
import { colors } from "@/theme/colors"

const UNDO_MS = 5000

export default function CalendarScreen() {
  const { state, updateState } = useAppState()
  const now = new Date()
  const today = toLocalDate(new Date())
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedLocalDate, setSelectedLocalDate] = useState(() =>
    defaultSelectedDate(now.getFullYear(), now.getMonth() + 1, now),
  )
  const [showEmptyHint, setShowEmptyHint] = useState(true)
  const [sheetDate, setSheetDate] = useState<string | null>(null)
  const [undo, setUndo] = useState<{ shift: Shift; index: number } | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasShifts = state.shifts.length > 0
  const showOverlay = !hasShifts && showEmptyHint
  const sheetShifts = sheetDate ? shiftsOnDate(state.shifts, sheetDate) : []

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

  useEffect(() => {
    return () => {
      if (undoTimer.current) {
        clearTimeout(undoTimer.current)
      }
    }
  }, [])

  function clearUndoTimer() {
    if (undoTimer.current) {
      clearTimeout(undoTimer.current)
      undoTimer.current = null
    }
  }

  function selectDate(localDate: string) {
    setShowEmptyHint(false)
    setSelectedLocalDate(localDate)
    if (shiftsOnDate(state.shifts, localDate).length === 0) {
      setSheetDate(null)
      router.push({ pathname: "/shift/new", params: { date: localDate } })
      return
    }
    setSheetDate(localDate)
  }

  function openNewShift(localDate: string) {
    router.push({ pathname: "/shift/new", params: { date: localDate } })
  }

  function requestDelete(shift: Shift) {
    Alert.alert(
      "Delete Shift?",
      "This will permanently remove this shift record. You can undo this briefly after deletion.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Shift",
          style: "destructive",
          onPress: () => {
            void confirmDelete(shift)
          },
        },
      ],
    )
  }

  async function confirmDelete(shift: Shift) {
    const { remaining, removed, index } = removeShift(state.shifts, shift.id)
    if (!removed) {
      return
    }
    await updateState((current) => ({
      ...current,
      shifts: removeShift(current.shifts, shift.id).remaining,
    }))
    if (sheetDate && shiftsOnDate(remaining, sheetDate).length === 0) {
      setSheetDate(null)
    }
    setUndo({ shift: removed, index })
    clearUndoTimer()
    undoTimer.current = setTimeout(() => {
      setUndo(null)
      undoTimer.current = null
    }, UNDO_MS)
  }

  async function undoDelete() {
    if (!undo) {
      return
    }
    const restored = undo
    clearUndoTimer()
    setUndo(null)
    await updateState((current) => ({
      ...current,
      shifts: insertShiftAt(current.shifts, restored.shift, restored.index),
    }))
    setSheetDate(restored.shift.localDate)
    setSelectedLocalDate(restored.shift.localDate)
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
      <View className="relative flex-1">
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

        {sheetDate && sheetShifts.length > 0 ? (
          <DayDetailsSheet
            localDate={sheetDate}
            shifts={sheetShifts}
            restaurants={state.restaurants}
            timeFormat={state.preferences.timeFormat}
            onClose={() => setSheetDate(null)}
            onAdd={() => openNewShift(sheetDate)}
            onEdit={(shiftId) =>
              router.push({ pathname: "/shift/[id]", params: { id: shiftId } })
            }
            onDelete={requestDelete}
          />
        ) : null}

        {undo ? (
          <UndoToast
            onUndo={() => {
              void undoDelete()
            }}
          />
        ) : null}
      </View>
    </SafeAreaView>
  )
}
