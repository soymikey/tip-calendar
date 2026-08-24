import { expect, test } from "@playwright/test";

test("mobile user can add a restaurant and save a shift with automatic tip-out snapshot", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Add restaurant" }).click();
  await page.getByLabel("Restaurant name").fill("Blue Plate Diner");
  await page.getByLabel("Fixed pay per shift").check();
  await page.getByLabel("Pay amount").fill("90");
  await page.getByLabel("Credit tips with paycheck").check();
  await page.getByLabel("Default tip-out rule").selectOption("tipsPercent");
  await page.getByLabel("Tip-out percent").fill("10");
  await page.getByRole("button", { name: "Save restaurant" }).click();

  await expect(page.getByText("Blue Plate Diner (default)")).toBeVisible();

  await page.getByRole("tab", { name: "Calendar" }).click();
  await page.getByRole("button", { name: "Select 2026-08-15" }).click();
  await expect(page.getByLabel("Shift restaurant").locator("option:checked")).toHaveText("Blue Plate Diner");
  await page.getByLabel("Work hours").fill("5");
  await page.getByLabel("Cash tips").fill("40");
  await page.getByLabel("Credit card tips").fill("160");
  await expect(page.getByText("$270.00")).toBeVisible();
  await page.getByRole("button", { name: "Calculation details" }).click();
  await expect(page.getByText("Tip-out: $20.00")).toBeVisible();
  await expect(page.getByText("Tip-out rule: 10% of total tips")).toBeVisible();
  await page.getByRole("button", { name: "Save shift" }).click();

  await page.getByLabel("Day detail").getByRole("button", { name: /Edit shift/ }).click();
  await page.getByRole("button", { name: "Calculation details" }).click();
  await expect(page.getByText("Tip-out rule: 10% of total tips")).toBeVisible();
});

test("mobile user can use sales percent tip-out only when sales amount is needed", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByLabel("Default tip-out rule").selectOption("salesPercent");
  await page.getByLabel("Tip-out percent").fill("3");
  await page.getByRole("button", { name: "Save restaurant" }).click();

  await page.getByRole("tab", { name: "Calendar" }).click();
  await page.getByRole("button", { name: "Select 2026-08-16" }).click();
  await expect(page.getByLabel("Sales amount")).toBeVisible();
  await page.getByLabel("Work hours").fill("4");
  await page.getByLabel("Sales amount").fill("1000");
  await page.getByLabel("Cash tips").fill("50");
  await page.getByLabel("Credit card tips").fill("150");
  await expect(page.getByText("Tip-out cannot be higher than total income.")).toHaveCount(0);
  await page.getByRole("button", { name: "Calculation details" }).click();
  await expect(page.getByText("Tip-out: $30.00")).toBeVisible();
});
