import { useState } from "react"
import { Text, View } from "react-native"

import { SegmentedControl } from "@/components/SegmentedControl"
import { TextField } from "@/components/TextField"
import { dollarsToCents } from "@/domain/money"
import type { TipOutRule } from "@/domain/restaurant"
import { TIP_OUT_OPTIONS } from "@/features/restaurant/payAndTipOutOptions"

import type { OnboardingDraft } from "./onboardingDraft"

type TipOutKind = TipOutRule["type"]

const RULE_HELP: Record<TipOutKind, string> = {
  none: "No tip-out will be deducted.",
  fixed: "A fixed amount is deducted each shift.",
  sales_percent: "A percentage of sales is deducted.",
  tips_percent: "A percentage of total tips is deducted.",
}

type StepTipOutProps = {
  draft: OnboardingDraft
  onChangeRule: (rule: TipOutRule) => void
}

function amountFromRule(rule: TipOutRule): string {
  if (rule.type === "fixed" && rule.amountCents > 0) {
    return (rule.amountCents / 100).toString()
  }
  return ""
}

function percentFromRule(rule: TipOutRule): string {
  if ((rule.type === "sales_percent" || rule.type === "tips_percent") && rule.percent > 0) {
    return rule.percent.toString()
  }
  return ""
}

function parseDollarInput(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) {
    return 0
  }
  const amount = Number(trimmed)
  if (!Number.isFinite(amount) || amount < 0) {
    return 0
  }
  return dollarsToCents(amount)
}

function parsePercentInput(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) {
    return 0
  }
  const amount = Number(trimmed)
  if (!Number.isFinite(amount) || amount < 0) {
    return 0
  }
  return amount
}

export function StepTipOut({ draft, onChangeRule }: StepTipOutProps) {
  const [amountText, setAmountText] = useState(() => amountFromRule(draft.tipOutRule))
  const [percentText, setPercentText] = useState(() => percentFromRule(draft.tipOutRule))

  function changeKind(kind: TipOutKind) {
    if (kind === "none") {
      onChangeRule({ type: "none" })
      return
    }
    if (kind === "fixed") {
      onChangeRule({ type: "fixed", amountCents: parseDollarInput(amountText) })
      return
    }
    onChangeRule({ type: kind, percent: parsePercentInput(percentText) })
  }

  function changeAmount(value: string) {
    setAmountText(value)
    onChangeRule({ type: "fixed", amountCents: parseDollarInput(value) })
  }

  function changePercent(value: string, kind: "sales_percent" | "tips_percent") {
    setPercentText(value)
    onChangeRule({ type: kind, percent: parsePercentInput(value) })
  }

  const kind = draft.tipOutRule.type

  return (
    <View className="w-full gap-5">
      <View className="w-full gap-2">
        <Text className="text-[13px] font-semibold uppercase text-[#8E8E93]">Tip-out type</Text>
        <SegmentedControl options={TIP_OUT_OPTIONS} value={kind} onChange={changeKind} />
      </View>
      {kind === "fixed" ? (
        <TextField
          label="Amount"
          prefix="$"
          keyboardType="decimal-pad"
          placeholder="0.00"
          value={amountText}
          variant="outline"
          onChangeText={changeAmount}
        />
      ) : null}
      {kind === "sales_percent" || kind === "tips_percent" ? (
        <TextField
          label="Percent"
          suffix="%"
          keyboardType="decimal-pad"
          placeholder="0"
          value={percentText}
          variant="outline"
          onChangeText={(value) => changePercent(value, kind)}
        />
      ) : null}
      <Text className="text-[14px] font-medium text-[#8E8E93]">{RULE_HELP[kind]}</Text>
    </View>
  )
}
