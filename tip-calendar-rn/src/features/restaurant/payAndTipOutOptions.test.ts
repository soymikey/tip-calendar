import { PAY_OPTIONS, TIP_OUT_OPTIONS } from "./payAndTipOutOptions"

describe("PAY_OPTIONS", () => {
  it("lists US restaurant pay types from most to least common", () => {
    expect(PAY_OPTIONS.map((option) => option.value)).toEqual(["hourly", "none", "fixed"])
  })
})

describe("TIP_OUT_OPTIONS", () => {
  it("lists US restaurant tip-out rules from most to least common", () => {
    expect(TIP_OUT_OPTIONS.map((option) => option.value)).toEqual([
      "sales_percent",
      "tips_percent",
      "fixed",
      "none",
    ])
  })
})
