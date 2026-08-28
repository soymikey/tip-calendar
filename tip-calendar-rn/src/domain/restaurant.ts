import { newEntityId } from "./id"
import type { Cents } from "./money"

export type PayType = "hourly" | "fixed" | "none"

export type TipOutRule =
  | { type: "none" }
  | { type: "fixed"; amountCents: Cents }
  | { type: "sales_percent"; percent: number }
  | { type: "tips_percent"; percent: number }

export type CreditCardTipPayout = "same_day" | "paycheck"

export type ShiftTag = "lunch" | "dinner"

export type Preferences = {
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
  currencySymbol: string
  timeFormat: "12h" | "24h"
  defaultRestaurantId: string | null
}

export type Restaurant = {
  id: string
  name: string
  payType: PayType
  payAmountCents: Cents
  creditCardTipPayout: CreditCardTipPayout
  defaultTipOutRule: TipOutRule
  createdAt: string
  updatedAt: string
}

export function createRestaurant(input: {
  name: string
  payType?: PayType
  payAmountCents?: Cents
  creditCardTipPayout?: CreditCardTipPayout
  defaultTipOutRule?: TipOutRule
  now?: string
  id?: string
}): Restaurant {
  const name = input.name.trim()
  if (name.length === 0) {
    throw new Error("Restaurant name is required")
  }
  const now = input.now ?? new Date().toISOString()
  return {
    id: input.id ?? newEntityId(),
    name,
    payType: input.payType ?? "none",
    payAmountCents: input.payAmountCents ?? 0,
    creditCardTipPayout: input.creditCardTipPayout ?? "same_day",
    defaultTipOutRule: input.defaultTipOutRule ?? { type: "none" },
    createdAt: now,
    updatedAt: now,
  }
}
