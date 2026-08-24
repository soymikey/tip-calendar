import { formatUsd } from "../../domain/money"
import type { Restaurant } from "../../domain/restaurant"
import type { ShiftIncome } from "../../domain/shift"

import { previewShiftIncome, resolveShiftHours, type ShiftDraft } from "./shiftDraft"

export type BreakdownLine = {
  label: string
  value: string
  hint?: string
  tone?: "muted" | "sum" | "deduct" | "net"
}

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : String(hours)
}

export function calculationBreakdown(
  draft: ShiftDraft,
  restaurant: Restaurant,
  income: ShiftIncome,
): { basis: string; lines: BreakdownLine[] } {
  const { hours } = resolveShiftHours(draft)
  const payType = draft.payType ?? restaurant.payType
  const payAmount = draft.payAmountCents ?? restaurant.payAmountCents
  const rule = income.tipOutSnapshot.rule

  let basis = "Total Tips"
  if (rule.type === "sales_percent") {
    basis = "Sales"
  } else if (rule.type === "fixed") {
    basis = "Fixed amount"
  } else if (rule.type === "none") {
    basis = "None"
  }

  const wageValue =
    payType === "hourly" && payAmount > 0
      ? `${formatUsd(payAmount)}/hr × ${formatHours(hours)} hrs = ${formatUsd(income.wageIncomeCents)}`
      : payType === "fixed"
        ? formatUsd(income.wageIncomeCents)
        : formatUsd(income.wageIncomeCents)

  let tipOutLabel = "Tip-out"
  if (rule.type === "tips_percent") {
    tipOutLabel = `Tip-out (${rule.percent}% of total tips)`
  } else if (rule.type === "sales_percent") {
    tipOutLabel = `Tip-out (${rule.percent}% of sales)`
  } else if (rule.type === "fixed") {
    tipOutLabel = "Tip-out (fixed)"
  }

  const hourlyValue =
    income.effectiveHourlyCents === null || income.effectiveHours <= 0
      ? "—"
      : `${formatUsd(income.netIncomeCents)} ÷ ${formatHours(income.effectiveHours)} hrs = ${formatUsd(income.effectiveHourlyCents)}/hr`

  const lines: BreakdownLine[] = [
    { label: "Cash Tips", value: formatUsd(draft.cashTipsCents), tone: "muted" },
    { label: "Card Tips", value: formatUsd(draft.cardTipsCents), tone: "muted" },
    {
      label: "Total Tips",
      value: `${formatUsd(draft.cashTipsCents)} + ${formatUsd(draft.cardTipsCents)} = ${formatUsd(income.totalTipsCents)}`,
      tone: "sum",
    },
    { label: payType === "hourly" ? "Hourly Wages" : "Wages", value: wageValue, tone: "muted" },
  ]

  if ((draft.otherIncomeCents ?? 0) > 0) {
    lines.push({
      label: "Other Income",
      value: formatUsd(draft.otherIncomeCents ?? 0),
      tone: "muted",
    })
  }

  lines.push(
    {
      label: "Gross Income",
      value: `${formatUsd(income.totalTipsCents)} + ${formatUsd(income.wageIncomeCents)}${(draft.otherIncomeCents ?? 0) > 0 ? ` + ${formatUsd(draft.otherIncomeCents ?? 0)}` : ""} = ${formatUsd(income.grossIncomeCents)}`,
      tone: "sum",
    },
    {
      label: tipOutLabel,
      value: income.tipOutCents > 0 ? `-${formatUsd(income.tipOutCents)}` : formatUsd(0),
      hint: rule.type === "tips_percent" || rule.type === "sales_percent" ? `Calculation basis: ${basis}` : undefined,
      tone: "deduct",
    },
    { label: "Net Income", value: formatUsd(income.netIncomeCents), tone: "net" },
    { label: "Actual Hourly Rate", value: hourlyValue, tone: "muted" },
  )

  return { basis, lines }
}
