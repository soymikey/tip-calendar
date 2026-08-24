import { expect, test } from "@playwright/test";

test("mobile user can export CSV and JSON, then import JSON only after confirming", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Select 2026-08-17" }).click();
  await page.getByLabel("Work hours").fill("5");
  await page.getByLabel("Cash tips").fill("40");
  await page.getByLabel("Credit card tips").fill("160");
  await page.getByRole("button", { name: "Save shift" }).click();
  await page.keyboard.press("Escape");

  await page.getByRole("tab", { name: "My" }).click();
  await page.getByRole("button", { name: "Data & backup" }).click();
  await page.getByRole("button", { name: "Export CSV" }).click();
  await expect(page.getByLabel("Export output")).toContainText("restaurant_name,date,total_tips");
  await expect(page.getByLabel("Export output")).toContainText("Sunny Table Bistro");

  await page.getByRole("button", { name: "Export JSON" }).click();
  const backup = await page.getByLabel("Export output").inputValue();

  await page.getByRole("button", { name: "Back to My" }).click();
  await page.getByRole("button", { name: "Restaurant settings" }).click();
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await page.getByRole("tab", { name: "Calendar" }).click();
  await expect(page.getByRole("dialog", { name: /Day detail/ })).toHaveCount(0);
  await page.getByRole("tab", { name: "My" }).click();
  await page.getByRole("button", { name: "Data & backup" }).click();

  await page.getByLabel("JSON backup to import").fill(backup);
  await page.getByRole("button", { name: "Import JSON backup" }).click();
  await expect(page.getByText("Confirm import before replacing local data.")).toBeVisible();

  await page.getByLabel("Replace local data with this backup").check();
  await page.getByRole("button", { name: "Import JSON backup" }).click();
  await expect(page.getByLabel("Day detail").getByText("Net Income")).toBeVisible();
  await expect(page.getByLabel("Day detail").getByText("$262.50")).toBeVisible();
});

test("mobile user sees plain language import error for bad backup data", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "My" }).click();
  await page.getByRole("button", { name: "Data & backup" }).click();
  await page.getByLabel("JSON backup to import").fill("{bad");
  await page.getByLabel("Replace local data with this backup").check();
  await page.getByRole("button", { name: "Import JSON backup" }).click();

  await expect(page.getByText("This backup file could not be read. Choose a valid JSON backup.")).toBeVisible();
});
