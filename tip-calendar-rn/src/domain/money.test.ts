import { addCents, centsToDollars, dollarsToCents, formatUsd } from "./money"

describe("dollarsToCents", () => {
  it("rounds half away from zero to the nearest cent", () => {
    expect(dollarsToCents(12.345)).toBe(1235)
    expect(dollarsToCents(12.344)).toBe(1234)
    expect(dollarsToCents(-1.226)).toBe(-123)
  })
})

describe("formatUsd", () => {
  it("formats accounting amounts with two decimals", () => {
    expect(formatUsd(124000)).toBe("$1,240.00")
    expect(formatUsd(284750)).toBe("$2,847.50")
  })

  it("formats compact calendar amounts without trailing .00", () => {
    expect(formatUsd(14200, { compact: true })).toBe("$142")
    expect(formatUsd(27350, { compact: true })).toBe("$273.50")
  })
})

describe("addCents", () => {
  it("sums without floating-point drift", () => {
    expect(addCents(1010, 2020, 3030)).toBe(6060)
    expect(centsToDollars(6060)).toBe(60.6)
  })
})
