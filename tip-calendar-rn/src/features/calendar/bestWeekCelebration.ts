import { startOfWeek, type LocalDate, type WeekStartsOn } from "../../domain/calendar"
import type { Shift } from "../../domain/shift"
import { netIncomeCentsForShift } from "../shift/shiftIncome"

let pending = false

export function requestBestWeekCelebration() {
  pending = true
}

export function takeBestWeekCelebration(): boolean {
  const next = pending
  pending = false
  return next
}

export function shouldCelebrateBestDayThisWeek(input: {
  shifts: Shift[]
  savedLocalDate: LocalDate
  todayLocalDate: LocalDate
  weekStartsOn: WeekStartsOn
}): boolean {
  if (input.savedLocalDate !== input.todayLocalDate) {
    return false
  }

  const weekStart = startOfWeek(input.savedLocalDate, input.weekStartsOn)
  const byDate = new Map<LocalDate, number>()
  for (const shift of input.shifts) {
    if (startOfWeek(shift.localDate, input.weekStartsOn) !== weekStart) {
      continue
    }
    byDate.set(shift.localDate, (byDate.get(shift.localDate) ?? 0) + netIncomeCentsForShift(shift))
  }

  const todayNet = byDate.get(input.savedLocalDate) ?? 0
  if (todayNet <= 0) {
    return false
  }

  let otherDays = 0
  for (const [date, net] of byDate) {
    if (date === input.savedLocalDate) {
      continue
    }
    otherDays += 1
    if (todayNet <= net) {
      return false
    }
  }
  return otherDays > 0
}
