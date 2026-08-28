import { formatUsd } from "../../domain/money"
import type { Restaurant } from "../../domain/restaurant"
import { previewShiftIncome, resolveShiftHours, type ShiftDraft } from "./shiftDraft"

export const HIGH_TIP_CENTS = 100_000

export type FieldKey = "hours" | "cashTips" | "cardTips" | "tipOut" | "unpaidBreak"

export type FieldMessage = {
  field: FieldKey
  tone: "error" | "warning"
  message: string
}

export function validateShiftDraft(draft: ShiftDraft, restaurant: Restaurant): FieldMessage[] {
  const { hours } = resolveShiftHours(draft)
  const unpaidBreakHours = draft.unpaidBreakHours ?? 0
  const income = previewShiftIncome(draft, restaurant)
  const messages: FieldMessage[] = []

  if (hours <= 0) {
    messages.push({
      field: "hours",
      tone: "error",
      message: "Please enter your work hours",
    })
  }

  if (unpaidBreakHours > hours && hours > 0) {
    messages.push({
      field: "unpaidBreak",
      tone: "error",
      message: `Break time cannot exceed work hours (${hours} hrs)`,
    })
  }

  if (income.tipOutCents > income.grossIncomeCents) {
    messages.push({
      field: "tipOut",
      tone: "error",
      message: `Tip-out (${formatUsd(income.tipOutCents)}) exceeds total income (${formatUsd(income.grossIncomeCents)})`,
    })
  }

  if (draft.cashTipsCents >= HIGH_TIP_CENTS) {
    messages.push({
      field: "cashTips",
      tone: "warning",
      message: "Tip amount seems unusually high. Please verify.",
    })
  }

  if (draft.cardTipsCents >= HIGH_TIP_CENTS) {
    messages.push({
      field: "cardTips",
      tone: "warning",
      message: "Tip amount seems unusually high. Please verify.",
    })
  }

  return messages
}
