import { expect, test } from "@playwright/test";

test("mobile user can export CSV and JSON, then import JSON only after confirming", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Record a shift" }).click();
  await page.getByLabel("Work hours").fill("5");
  await page.getByLabel("Cash tips").fill("40");
  await page.getByLabel("Credit card tips").fill("160");
  await page.getByRole("button", { name: "Save shift" }).click();

  await page.getByRole("button", { name: "Export CSV" }).click();
  await expect(page.getByLabel("Export output")).toContainText("restaurant_name,date,total_tips");
  await expect(page.getByLabel("Export output")).toContainText("Sunny Table Bistro");

  await page.getByRole("button", { name: "Export JSON" }).click();
  const backup = await page.getByLabel("Export output").inputValue();

  await page.getByRole("button", { name: "Reset demo data" }).click();
  await expect(page.getByText("No shifts recorded yet.")).toBeVisible();

  await page.getByLabel("JSON backup to import").fill(backup);
  await page.getByRole("button", { name: "Import JSON backup" }).click();
  await expect(page.getByText("Confirm import before replacing local data.")).toBeVisible();

  await page.getByLabel("Replace local data with this backup").check();
  await page.getByRole("button", { name: "Import JSON backup" }).click();
  await expect(page.getByLabel("Day detail").getByText("Net income $262.50")).toBeVisible();
});

test("mobile user sees plain language import error for bad backup data", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("JSON backup to import").fill("{bad");
  await page.getByLabel("Replace local data with this backup").check();
  await page.getByRole("button", { name: "Import JSON backup" }).click();

  await expect(page.getByText("This backup file could not be read. Choose a valid JSON backup.")).toBeVisible();
});
