export type LocalDate = string
export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type MonthCell = {
  localDate: LocalDate
  day: number
}

function pad(value: number): string {
  return value.toString().padStart(2, "0")
}

export function toLocalDate(date: Date): LocalDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseLocalDate(localDate: LocalDate): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate)
  if (!match) {
    throw new Error("Date must use YYYY-MM-DD")
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function startOfWeek(localDate: LocalDate, weekStartsOn: WeekStartsOn): LocalDate {
  const date = parseLocalDate(localDate)
  const weekday = date.getDay()
  const offset = (weekday - weekStartsOn + 7) % 7
  date.setDate(date.getDate() - offset)
  return toLocalDate(date)
}

export function isFutureLocalDate(localDate: LocalDate, today: LocalDate): boolean {
  return localDate > today
}

export function addDays(localDate: LocalDate, days: number): LocalDate {
  const date = parseLocalDate(localDate)
  date.setDate(date.getDate() + days)
  return toLocalDate(date)
}

export function endOfWeek(localDate: LocalDate, weekStartsOn: WeekStartsOn): LocalDate {
  return addDays(startOfWeek(localDate, weekStartsOn), 6)
}

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const

export function weekdayLetters(weekStartsOn: WeekStartsOn): string[] {
  return [...WEEKDAY_LETTERS.slice(weekStartsOn), ...WEEKDAY_LETTERS.slice(0, weekStartsOn)]
}

export function buildMonthGrid(
  year: number,
  month: number,
  weekStartsOn: WeekStartsOn,
): (MonthCell | null)[][] {
  const first = new Date(year, month - 1, 1)
  const firstWeekday = first.getDay()
  const leading = (firstWeekday - weekStartsOn + 7) % 7
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (MonthCell | null)[] = Array.from({ length: leading }, () => null)

  for (let day = 1; day <= daysInMonth; day += 1) {
    const localDate = `${year}-${pad(month)}-${pad(day)}`
    cells.push({ localDate, day })
  }

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  const rows: (MonthCell | null)[][] = []
  for (let index = 0; index < cells.length; index += 7) {
    rows.push(cells.slice(index, index + 7))
  }
  return rows
}

export function groupNetIncomeByLocalDate<T>(
  items: T[],
  netIncomeCents: (item: T) => number,
  localDate: (item: T) => LocalDate = (item) => (item as { localDate: LocalDate }).localDate,
): Map<LocalDate, number> {
  const grouped = new Map<LocalDate, number>()
  for (const item of items) {
    const key = localDate(item)
    grouped.set(key, (grouped.get(key) ?? 0) + netIncomeCents(item))
  }
  return grouped
}
