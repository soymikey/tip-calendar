import {
  addDays,
  endOfWeek,
  startOfWeek,
  type LocalDate,
  type WeekStartsOn,
} from "../../domain/calendar"
import type { Cents } from "../../domain/money"
import type { Restaurant } from "../../domain/restaurant"
import type { Shift } from "../../domain/shift"
import { netIncomeCentsForShift } from "../shift/shiftIncome"

export type StatsMode = "week" | "month"

export type DailyPoint = {
  localDate: LocalDate
  label: string
  netCents: Cents
}

export type StatsSummary = {
  netIncomeCents: Cents
  totalTipsCents: Cents
  tipOutCents: Cents
  averageHourlyCents: Cents | null
  shiftsWorked: number
  hoursWorked: number
  bestDay: DailyPoint | null
  days: DailyPoint[]
}

export function weekRangeLabel(weekStart: LocalDate, weekStartsOn: WeekStartsOn): string {
  const start = parseLocalDateSafe(weekStart)
  const end = parseLocalDateSafe(endOfWeek(weekStart, weekStartsOn))
  const startText = start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const endText = end.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${startText} - ${endText}`
}

export function monthRangeLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

function parseLocalDateSafe(localDate: LocalDate): Date {
  const [year, month, day] = localDate.split("-").map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function summarizeStats(input: {
  shifts: Shift[]
  restaurants: Restaurant[]
  mode: StatsMode
  weekStart: LocalDate
  year: number
  month: number
  restaurantId?: string
  weekStartsOn: WeekStartsOn
}): StatsSummary {
  const monthPrefix = `${input.year}-${String(input.month).padStart(2, "0")}`
  const scoped = input.restaurantId
    ? input.shifts.filter((shift) => shift.restaurantId === input.restaurantId)
    : input.shifts

  const inRange = scoped.filter((shift) => {
    if (input.mode === "week") {
      return startOfWeek(shift.localDate, input.weekStartsOn) === input.weekStart
    }
    return shift.localDate.startsWith(monthPrefix)
  })

  let netIncomeCents = 0
  let totalTipsCents = 0
  let tipOutCents = 0
  let hoursWorked = 0
  const byDate = new Map<LocalDate, Cents>()

  for (const shift of inRange) {
    const net = netIncomeCentsForShift(shift)
    const tips = shift.incomeSnapshot.totalTipsCents
    const hours = shift.incomeSnapshot.effectiveHours
    netIncomeCents += net
    totalTipsCents += tips
    tipOutCents += shift.incomeSnapshot.tipOutCents
    hoursWorked += hours
    byDate.set(shift.localDate, (byDate.get(shift.localDate) ?? 0) + net)
  }

  const days =
    input.mode === "week"
      ? Array.from({ length: 7 }, (_, index) => {
          const localDate = addDays(input.weekStart, index)
          const weekday = parseLocalDateSafe(localDate).toLocaleDateString("en-US", {
            weekday: "short",
          })
          return {
            localDate,
            label: `${weekday} ${Number(localDate.slice(8))}`,
            netCents: byDate.get(localDate) ?? 0,
          }
        })
      : Array.from(
          { length: new Date(input.year, input.month, 0).getDate() },
          (_, index) => {
            const day = index + 1
            const localDate = `${monthPrefix}-${String(day).padStart(2, "0")}`
            return {
              localDate,
              label: String(day),
              netCents: byDate.get(localDate) ?? 0,
            }
          },
        )

  const bestDay =
    days.reduce<DailyPoint | null>((best, day) => {
      if (day.netCents <= 0) {
        return best
      }
      if (!best || day.netCents > best.netCents) {
        return day
      }
      return best
    }, null)

  return {
    netIncomeCents,
    totalTipsCents,
    tipOutCents,
    averageHourlyCents: hoursWorked > 0 ? Math.round(netIncomeCents / hoursWorked) : null,
    shiftsWorked: inRange.length,
    hoursWorked,
    bestDay,
    days,
  }
}
