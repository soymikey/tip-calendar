import { parseLocalDate } from "../../domain/calendar"
import { formatUsd, type Cents } from "../../domain/money"

export function calendarDayAccessibilityLabel(
  localDate: string,
  amountCents?: Cents,
  isToday = false,
): string {
  const dateText = parseLocalDate(localDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
  const labeled = isToday ? `Today, ${dateText}` : dateText
  if (amountCents === undefined) {
    return labeled
  }
  return `${labeled}, ${formatUsd(amountCents)}`
}
