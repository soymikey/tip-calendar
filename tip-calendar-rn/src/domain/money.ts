export type Cents = number

export function dollarsToCents(dollars: number): Cents {
  if (!Number.isFinite(dollars)) {
    throw new Error("Amount must be a finite number")
  }
  return Math.round(dollars * 100)
}

export function centsToDollars(cents: Cents): number {
  return cents / 100
}

export function formatUsd(cents: Cents, options?: { compact?: boolean }): string {
  const dollars = centsToDollars(cents)
  const compact = options?.compact === true && cents % 100 === 0
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 0 : 2,
  }).format(dollars)
}

export function addCents(...values: Cents[]): Cents {
  return values.reduce((sum, value) => sum + value, 0)
}
