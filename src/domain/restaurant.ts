import type { ShiftRecord } from "./shift";

export type PayType = "hourly" | "fixedShift";
export type CreditTipPayout = "sameDay" | "paycheck";
export type TipOutRule =
  | { type: "none" }
  | { type: "fixed"; amount: number }
  | { type: "salesPercent"; percent: number }
  | { type: "tipsPercent"; percent: number };

export type RestaurantSettings = {
  id: string;
  name: string;
  payType: PayType;
  payAmount: number;
  creditTipPayout: CreditTipPayout;
  defaultTipOut: TipOutRule;
};

export type AppState = {
  version: 1;
  demoSeededAt: string;
  restaurant: RestaurantSettings;
  defaultRestaurantId: string;
  restaurants: RestaurantSettings[];
  shifts: ShiftRecord[];
};

export function normalizePayAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

export function formatPaySummary(settings: Pick<RestaurantSettings, "payType" | "payAmount">): string {
  const amount = normalizePayAmount(settings.payAmount).toFixed(2);
  return settings.payType === "hourly" ? `$${amount} per hour` : `$${amount} per shift`;
}

export function restaurantDisplayName(settings: { name: string; isDefault: boolean }): string {
  return settings.isDefault ? `${settings.name} (default)` : settings.name;
}

export function normalizeTipOutRule(rule: Partial<TipOutRule> | undefined): TipOutRule {
  if (!rule || !("type" in rule)) {
    return { type: "none" };
  }

  if (rule.type === "fixed") {
    return { type: "fixed", amount: normalizePayAmount(Number(rule.amount)) };
  }

  if (rule.type === "salesPercent" || rule.type === "tipsPercent") {
    return { type: rule.type, percent: normalizePayAmount(Number(rule.percent)) };
  }

  return { type: "none" };
}

export function tipOutRuleLabel(rule: TipOutRule): string {
  if (rule.type === "fixed") {
    return `${normalizePayAmount(rule.amount).toFixed(2)} fixed`;
  }
  if (rule.type === "salesPercent") {
    return `${normalizePayAmount(rule.percent)}% of sales`;
  }
  if (rule.type === "tipsPercent") {
    return `${normalizePayAmount(rule.percent)}% of total tips`;
  }
  return "No tip-out";
}
