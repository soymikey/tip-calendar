import { parseLocalDate } from "../../domain/calendar"
import { formatUsd, type Cents } from "../../domain/money"

export function calendarDayAccessibilityLabel(
  localDate: string,
  amountCents?: Cents,
): string {
  const dateText = parseLocalDate(localDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
  if (amountCents === undefined) {
    return dateText
  }
  return `${dateText}, ${formatUsd(amountCents)}`
}
