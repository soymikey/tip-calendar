import type { PayType, TipOutRule } from "../../domain/restaurant"

export const PAY_OPTIONS: { value: PayType; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "none", label: "No Base" },
  { value: "fixed", label: "Per Shift" },
]

export const TIP_OUT_OPTIONS: { value: TipOutRule["type"]; label: string }[] = [
  { value: "sales_percent", label: "% Sales" },
  { value: "tips_percent", label: "% Tips" },
  { value: "fixed", label: "Fixed" },
  { value: "none", label: "None" },
]
