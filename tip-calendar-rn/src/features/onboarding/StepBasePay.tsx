import { useEffect, useState } from "react"
import { Text, View } from "react-native"

import { SegmentedControl } from "@/components/SegmentedControl"
import { TextField } from "@/components/TextField"
import { dollarsToCents } from "@/domain/money"
import type { PayType } from "@/domain/restaurant"

import type { OnboardingDraft } from "./onboardingDraft"

const PAY_OPTIONS: { value: PayType; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "fixed", label: "Per Shift" },
  { value: "none", label: "No Base" },
]

type StepBasePayProps = {
  draft: OnboardingDraft
  onChangePay: (payType: PayType, payAmountCents: number) => void
}

function centsToInput(cents: number): string {
  if (cents <= 0) {
    return ""
  }
  return (cents / 100).toString()
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

export function StepBasePay({ draft, onChangePay }: StepBasePayProps) {
  const [amountText, setAmountText] = useState(() => centsToInput(draft.payAmountCents))

  useEffect(() => {
    if (draft.payType === "none") {
      setAmountText("")
    }
  }, [draft.payType])

  function changePayType(payType: PayType) {
    const payAmountCents = payType === "none" ? 0 : parseDollarInput(amountText)
    if (payType === "none") {
      setAmountText("")
    }
    onChangePay(payType, payAmountCents)
  }

  function changeAmount(value: string) {
    setAmountText(value)
    onChangePay(draft.payType, parseDollarInput(value))
  }

  return (
    <View className="w-full gap-5">
      <View className="w-full gap-2">
        <Text className="text-[13px] font-semibold uppercase text-[#8E8E93]">Salary type</Text>
        <SegmentedControl options={PAY_OPTIONS} value={draft.payType} onChange={changePayType} />
      </View>
      {draft.payType === "hourly" ? (
        <TextField
          label="Hourly rate"
          prefix="$"
          suffix="/ hr"
          keyboardType="decimal-pad"
          placeholder="0.00"
          value={amountText}
          variant="outline"
          onChangeText={changeAmount}
        />
      ) : null}
      {draft.payType === "fixed" ? (
        <TextField
          label="Per shift"
          prefix="$"
          keyboardType="decimal-pad"
          placeholder="0.00"
          value={amountText}
          variant="outline"
          onChangeText={changeAmount}
        />
      ) : null}
    </View>
  )
}
