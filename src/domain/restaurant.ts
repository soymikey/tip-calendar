import type { ShiftRecord } from "./shift";

export type PayType = "hourly" | "fixedShift";

export type RestaurantSettings = {
  id: "default";
  name: string;
  payType: PayType;
  payAmount: number;
};

export type AppState = {
  version: 1;
  demoSeededAt: string;
  restaurant: RestaurantSettings;
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
