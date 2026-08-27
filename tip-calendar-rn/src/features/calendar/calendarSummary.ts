import { startOfWeek, type LocalDate, type WeekStartsOn } from "../../domain/calendar"
import type { Cents } from "../../domain/money"
import type { Restaurant } from "../../domain/restaurant"
import type { Shift } from "../../domain/shift"
import { netIncomeCentsForShift } from "../shift/shiftIncome"

export type CalendarSummary = {
  byDate: Map<LocalDate, Cents>
  weekCents: Cents
  monthCents: Cents
  hourlyCents: Cents | null
}

function netForShift(shift: Shift): Cents {
  return netIncomeCentsForShift(shift)
}

export function summarizeCalendar(input: {
  shifts: Shift[]
  restaurants: Restaurant[]
  weekAnchor: LocalDate
  year: number
  month: number
  weekStartsOn: WeekStartsOn
}): CalendarSummary {
  const weekStart = startOfWeek(input.weekAnchor, input.weekStartsOn)
  const monthPrefix = `${input.year}-${String(input.month).padStart(2, "0")}`
  const byDate = new Map<LocalDate, Cents>()
  let weekCents = 0
  let monthCents = 0
  let monthHours = 0

  for (const shift of input.shifts) {
    const net = netForShift(shift)
    byDate.set(shift.localDate, (byDate.get(shift.localDate) ?? 0) + net)
    if (startOfWeek(shift.localDate, input.weekStartsOn) === weekStart) {
      weekCents += net
    }
    if (shift.localDate.startsWith(monthPrefix)) {
      monthCents += net
      monthHours += Math.max(0, shift.hours - shift.unpaidBreakHours)
    }
  }

  return {
    byDate,
    weekCents,
    monthCents,
    hourlyCents: monthHours > 0 ? Math.round(monthCents / monthHours) : null,
  }
}
