import { expect, test } from "@playwright/test";

test("mobile calendar shows daily, week, and month summaries for same-day shifts", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "tip-calendar:v1",
      JSON.stringify({
        version: 1,
        demoSeededAt: "2026-08-24T00:00:00.000Z",
        restaurant: {
          id: "default",
          name: "Sunny Table Bistro",
          payType: "hourly",
          payAmount: 12.5,
          creditTipPayout: "sameDay",
          defaultTipOut: { type: "none" },
        },
        defaultRestaurantId: "default",
        restaurants: [
          {
            id: "default",
            name: "Sunny Table Bistro",
            payType: "hourly",
            payAmount: 12.5,
            creditTipPayout: "sameDay",
            defaultTipOut: { type: "none" },
          },
        ],
        shifts: [
          {
            id: "same-day-one",
            date: "2026-08-14",
            restaurantId: "default",
            hours: 4,
            useClock: false,
            clockIn: "",
            clockOut: "",
            unpaidBreak: 0,
            cashTips: 20,
            creditTips: 80,
            otherIncome: 0,
            manualTipOut: 10,
            salesAmount: 0,
            tipOutRuleSnapshot: { type: "none" },
            notes: "Lunch Shift",
            createdAt: "2026-08-14T12:00:00.000Z",
            updatedAt: "2026-08-14T12:00:00.000Z",
          },
          {
            id: "same-day-two",
            date: "2026-08-14",
            restaurantId: "default",
            hours: 5,
            useClock: false,
            clockIn: "",
            clockOut: "",
            unpaidBreak: 0,
            cashTips: 40,
            creditTips: 120,
            otherIncome: 0,
            manualTipOut: 0,
            salesAmount: 0,
            tipOutRuleSnapshot: { type: "none" },
            notes: "Dinner Shift",
            createdAt: "2026-08-14T18:00:00.000Z",
            updatedAt: "2026-08-14T18:00:00.000Z",
          },
        ],
      }),
    );
  });
  await page.goto("/");

  const today = "2026-08-14";

  await expect(page.getByTestId(`calendar-net-${today}`)).toContainText("$362.50");
  await expect(page.getByLabel("Income summaries")).toContainText("This Week");
  await expect(page.getByLabel("Income summaries")).toContainText("This Month");
  await expect(page.getByLabel("Income summaries")).toContainText("Hourly");
  await expect(page.getByLabel("Income summaries")).toContainText("$362.50");
  await expect(page.getByLabel("Income summaries")).toContainText("$40.28/hr");
  await page.getByRole("button", { name: `Select ${today}` }).click();
  await expect(page.getByLabel("Day detail").getByText("Lunch Shift")).toBeVisible();
  await expect(page.getByLabel("Day detail").getByText("Dinner Shift")).toBeVisible();
  await expect(page.locator(".shift-detail-card")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Add another shift" })).toBeVisible();
});

test("mobile day detail handles empty dates, edit entry, and cross-midnight badges", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /Next month/ }).click();
  const selected = "2026-09-10";
  await page.getByRole("button", { name: `Select ${selected}` }).click();

  await page.getByRole("button", { name: "More options" }).click();
  await page.getByLabel("Use clock in and out").check();
  await page.getByLabel("Clock in", { exact: true }).fill("22:00");
  await page.getByLabel("Clock out").fill("02:00");
  await page.getByLabel("Cash tips").fill("50");
  await page.getByRole("button", { name: "Save shift" }).click();

  await expect(page.getByLabel("Day detail").getByText("Cross-midnight shift")).toBeVisible();
  await page.getByLabel("Day detail").getByRole("button", { name: /Edit shift/ }).click();
  await expect(page.getByLabel("Use clock in and out")).toBeChecked();
});
