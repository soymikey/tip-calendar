import { createRestaurant } from "../../domain/restaurant"
import { HIGH_TIP_CENTS, validateShiftDraft } from "./shiftValidation"
import { canSaveShift, previewShiftIncome, toShift } from "./shiftDraft"

const restaurant = createRestaurant({
  name: "Bluebird",
  payType: "hourly",
  payAmountCents: 1500,
  defaultTipOutRule: { type: "tips_percent", percent: 3 },
  now: "2026-08-21T20:00:00.000Z",
})

const draft = {
  localDate: "2026-08-21",
  restaurantId: restaurant.id,
  hours: 6.5,
  cashTipsCents: 8500,
  cardTipsCents: 12200,
}

describe("shiftValidation", () => {
  it("uses clock in/out hours and marks overnight", () => {
    const overnightDraft = {
      ...draft,
      useClock: true,
      clockIn: "18:00",
      clockOut: "00:30",
    }
    const income = previewShiftIncome(overnightDraft, restaurant)
    expect(income.effectiveHours).toBe(6.5)
    const shift = toShift(overnightDraft, restaurant, "2026-08-21T20:00:00.000Z")
    expect(shift.overnight).toBe(true)
    expect(shift.hours).toBe(6.5)
    expect(shift.clockIn).toBe("18:00")
    expect(shift.clockOut).toBe("00:30")
  })

  it("blocks save when hours are missing", () => {
    expect(canSaveShift({ ...draft, hours: 0 })).toBe(false)
  })

  it("reports a blocking error when break exceeds hours", () => {
    const messages = validateShiftDraft({ ...draft, unpaidBreakHours: 7 }, restaurant)
    expect(messages.some((item) => item.field === "unpaidBreak" && item.tone === "error")).toBe(true)
  })

  it("reports a blocking error when tip-out exceeds gross income", () => {
    const messages = validateShiftDraft(
      { ...draft, tipOutRule: { type: "fixed", amountCents: 50000 } },
      restaurant,
    )
    expect(messages.some((item) => item.field === "tipOut" && item.tone === "error")).toBe(true)
  })

  it("warns when a tip field is unusually high but still allows save", () => {
    const messages = validateShiftDraft(
      { ...draft, cashTipsCents: HIGH_TIP_CENTS },
      restaurant,
    )
    expect(messages.some((item) => item.field === "cashTips" && item.tone === "warning")).toBe(true)
    expect(canSaveShift({ ...draft, cashTipsCents: HIGH_TIP_CENTS })).toBe(true)
  })
})
