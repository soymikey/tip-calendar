import { createRestaurant, type PayType, type Restaurant, type TipOutRule } from "../../domain/restaurant"

export type OnboardingStep = 1 | 2 | 3

export type OnboardingDraft = {
  step: OnboardingStep
  name: string
  payType: PayType
  payAmountCents: number
  tipOutRule: TipOutRule
}

export type OnboardingAction =
  | { type: "init" }
  | { type: "setName"; name: string }
  | { type: "next" }
  | { type: "back" }
  | { type: "setPay"; payType: PayType; payAmountCents: number }
  | { type: "setTipOut"; rule: TipOutRule }
  | { type: "skip" }

export function reduceOnboarding(
  draft: OnboardingDraft | undefined,
  action: OnboardingAction,
): OnboardingDraft {
  const current: OnboardingDraft =
    draft ??
    {
      step: 1,
      name: "",
      payType: "none",
      payAmountCents: 0,
      tipOutRule: { type: "none" },
    }

  switch (action.type) {
    case "init":
      return current
    case "setName":
      return { ...current, name: action.name }
    case "next":
      return { ...current, step: current.step === 3 ? 3 : ((current.step + 1) as OnboardingStep) }
    case "back":
      return { ...current, step: current.step === 1 ? 1 : ((current.step - 1) as OnboardingStep) }
    case "setPay":
      return { ...current, payType: action.payType, payAmountCents: action.payAmountCents }
    case "setTipOut":
      return { ...current, tipOutRule: action.rule }
    case "skip":
      return { ...current, name: current.name.trim() || "My Restaurant" }
  }
}

export function canContinueStep(draft: OnboardingDraft): boolean {
  if (draft.step === 1) {
    return draft.name.trim().length > 0
  }
  if (draft.step === 2) {
    if (draft.payType === "none") {
      return true
    }
    return draft.payAmountCents > 0
  }
  if (draft.tipOutRule.type === "fixed") {
    return draft.tipOutRule.amountCents > 0
  }
  if (draft.tipOutRule.type === "sales_percent" || draft.tipOutRule.type === "tips_percent") {
    return draft.tipOutRule.percent > 0
  }
  return true
}

export function completeOnboarding(draft: OnboardingDraft, now: string): Restaurant {
  return createRestaurant({
    name: draft.name.trim() || "My Restaurant",
    payType: draft.payType,
    payAmountCents: draft.payAmountCents,
    defaultTipOutRule: draft.tipOutRule,
    now,
  })
}
