import { createRestaurant } from "../../domain/restaurant"
import { calculationBreakdown } from "./calculationBreakdown"
import { previewShiftIncome } from "./shiftDraft"

const restaurant = createRestaurant({
  name: "Bluebird",
  payType: "hourly",
  payAmountCents: 1500,
  defaultTipOutRule: { type: "tips_percent", percent: 15 },
})

const draft = {
  localDate: "2026-08-21",
  restaurantId: restaurant.id,
  hours: 6.5,
  cashTipsCents: 8500,
  cardTipsCents: 12200,
  payType: "hourly" as const,
  payAmountCents: 1500,
  tipOutRule: { type: "tips_percent" as const, percent: 15 },
}

describe("calculationBreakdown", () => {
  it("shows tip-out percent basis and wage formula", () => {
    const income = previewShiftIncome(draft, restaurant)
    const breakdown = calculationBreakdown(draft, restaurant, income)
    expect(breakdown.basis).toBe("Total Tips")
    expect(breakdown.lines.find((line) => line.label === "Total Tips")?.value).toContain("$207.00")
    expect(breakdown.lines.find((line) => line.label.startsWith("Tip-out"))?.label).toContain("15% of total tips")
    expect(breakdown.lines.find((line) => line.label === "Hourly Wages")?.value).toContain("6.5 hrs")
  })
})
