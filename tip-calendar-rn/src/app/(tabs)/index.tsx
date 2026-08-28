import { router, useFocusEffect } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Alert, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { CalendarMonth, defaultSelectedDate } from "@/features/calendar/CalendarMonth"
import { DayDetailsSheet } from "@/features/calendar/DayDetailsSheet"
import { summarizeCalendar, hasShiftsInMonth } from "@/features/calendar/calendarSummary"
import { nextCalendarPress, nextFilledDate } from "@/features/calendar/calendarPress"
import { EmptyShiftOverlay } from "@/features/calendar/EmptyShiftOverlay"
import { UndoToast } from "@/features/calendar/UndoToast"
import { FUTURE_SHIFT_HINT, warnFutureDate } from "@/features/calendar/futureDate"
import { HintToast } from "@/components/HintToast"
import { formatUsd } from "@/domain/money"
import { isFutureLocalDate, parseLocalDate, toLocalDate } from "@/domain/calendar"
import type { Shift } from "@/domain/shift"
import {
  insertShiftAt,
  removeShift,
  shiftsOnDate,
} from "@/features/shift/shiftDraft"
import { takeOpenDateRequest } from "@/features/calendar/openDateRequest"
import { useAppState } from "@/state/AppStateContext"
import { colors } from "@/theme/colors"

const UNDO_MS = 5000
const HINT_MS = 2500

export default function CalendarScreen() {
  const { state, updateState } = useAppState()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedLocalDate, setSelectedLocalDate] = useState(() =>
    defaultSelectedDate(now.getFullYear(), now.getMonth() + 1, now),
  )
  const [showEmptyHint, setShowEmptyHint] = useState(true)
  const [sheetDate, setSheetDate] = useState<string | null>(null)
  const [filledLocalDate, setFilledLocalDate] = useState<string | null>(null)
  const [peekedLocalDate, setPeekedLocalDate] = useState<string | null>(null)
  const [undo, setUndo] = useState<{ shift: Shift; index: number } | null>(null)
  const [futureHint, setFutureHint] = useState(false)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openingRef = useRef(false)
  const todayLocalDate = toLocalDate(now)
  const hasShifts = state.shifts.length > 0
  const monthHasShifts = hasShiftsInMonth(state.shifts, year, month)
  const showOverlay = !monthHasShifts && showEmptyHint
  const sheetShifts = sheetDate ? shiftsOnDate(state.shifts, sheetDate) : []

  const summary = useMemo(
    () =>
      summarizeCalendar({
        shifts: state.shifts,
        restaurants: state.restaurants,
        weekAnchor: selectedLocalDate,
        year,
        month,
        weekStartsOn: state.preferences.weekStartsOn,
      }),
    [state.shifts, state.restaurants, state.preferences.weekStartsOn, selectedLocalDate, year, month],
  )

  function changeMonth(nextYear: number, nextMonth: number) {
    setPeekedLocalDate(null)
    setYear(nextYear)
    setMonth(nextMonth)
    setSelectedLocalDate(defaultSelectedDate(nextYear, nextMonth))
    setShowEmptyHint(true)
  }

  useEffect(() => {
    return () => {
      if (undoTimer.current) {
        clearTimeout(undoTimer.current)
      }
      if (hintTimer.current) {
        clearTimeout(hintTimer.current)
      }
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      openingRef.current = false
      const date = takeOpenDateRequest()
      if (!date) {
        return
      }
      const parsed = parseLocalDate(date)
      setPeekedLocalDate(date)
      setShowEmptyHint(false)
      setYear(parsed.getFullYear())
      setMonth(parsed.getMonth() + 1)
      setSelectedLocalDate(date)
      if (isFutureLocalDate(date, todayLocalDate)) {
        setFilledLocalDate(null)
        setSheetDate(null)
        showFutureHint()
        return
      }
      setFilledLocalDate(date)
      if (shiftsOnDate(state.shifts, date).length === 0) {
        setSheetDate(null)
        openingRef.current = true
        router.push({ pathname: "/shift/new", params: { date } })
        return
      }
      setSheetDate(date)
    }, [state.shifts, todayLocalDate]),
  )

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

  function clearUndoTimer() {
    if (undoTimer.current) {
      clearTimeout(undoTimer.current)
      undoTimer.current = null
    }
  }

  function openDate(localDate: string) {
    if (shiftsOnDate(state.shifts, localDate).length === 0) {
      if (openingRef.current) {
        return
      }
      setSheetDate(null)
      openingRef.current = true
      router.push({ pathname: "/shift/new", params: { date: localDate } })
      return
    }
    setSheetDate(localDate)
  }

  function selectDate(localDate: string) {
    setShowEmptyHint(false)
    const next = nextCalendarPress(peekedLocalDate, localDate, openingRef.current)
    setPeekedLocalDate(next.armedLocalDate)
    setSelectedLocalDate(next.selectedLocalDate)
    setFilledLocalDate(nextFilledDate(filledLocalDate, localDate, next.open && !isFutureLocalDate(localDate, todayLocalDate)))
    if (next.open && isFutureLocalDate(localDate, todayLocalDate)) {
      showFutureHint()
      return
    }
    if (next.open) {
      openDate(localDate)
    }
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
          peekedLocalDate={peekedLocalDate}
          filledLocalDate={filledLocalDate}
          todayLocalDate={todayLocalDate}
          weekStartsOn={state.preferences.weekStartsOn}
          amountsByDate={summary.byDate}
          faded={showOverlay}
          overlay={
            showOverlay ? (
              <EmptyShiftOverlay
                hasAnyShifts={hasShifts}
                onDismiss={() => setShowEmptyHint(false)}
              />
            ) : null
          }
          belowHeader={
            <View className="flex-row gap-2 px-5 py-1">
              {cards.map((card) => (
                <View
                  key={card.label}
                  accessible
                  accessibilityLabel={`${card.label} ${card.value}`}
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
            onClose={() => {
              setSheetDate(null)
            }}
            onAdd={() => {
              setSheetDate(null)
              openNewShift(sheetDate)
            }}
            onEdit={(shiftId) => {
              setSheetDate(null)
              router.push({ pathname: "/shift/[id]", params: { id: shiftId } })
            }}
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
        {futureHint ? <HintToast message={FUTURE_SHIFT_HINT} /> : null}
      </View>
    </SafeAreaView>
  )
}
