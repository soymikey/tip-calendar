import { expect, test } from "@playwright/test";

test("mobile user can create, edit, delete, undo, and refresh a shift", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Work hours").fill("6");
  await page.getByLabel("Cash tips").fill("45");
  await page.getByLabel("Credit card tips").fill("180");
  await page.getByLabel("Other income").fill("20");
  await page.getByLabel("Manual tip-out").fill("35");
  await expect(page.getByText("$285.00")).toBeVisible();
  await page.getByRole("button", { name: "Save shift" }).click();

  await expect(page.getByLabel("Day detail").getByText("Net income $285.00")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Day detail").getByText("Net income $285.00")).toBeVisible();

  await page.getByLabel("Day detail").getByRole("button", { name: /Edit shift/ }).click();
  await page.getByLabel("Cash tips").fill("55");
  await page.getByRole("button", { name: "Update shift" }).click();
  await expect(page.getByLabel("Day detail").getByText("Net income $295.00")).toBeVisible();

  await page.getByLabel("Day detail").getByRole("button", { name: /Delete shift/ }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("No shifts recorded yet.")).toBeVisible();

  await page.getByRole("button", { name: "Undo delete" }).click();
  await expect(page.getByLabel("Day detail").getByText("Net income $295.00")).toBeVisible();
});

test("mobile user sees advanced clock and validation states", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "More options" }).click();
  await page.getByLabel("Use clock in and out").check();
  await page.getByLabel("Clock in", { exact: true }).fill("22:30");
  await page.getByLabel("Clock out").fill("02:00");
  await page.getByLabel("Unpaid break hours").fill("0.5");
  await page.getByLabel("Manual tip-out").fill("999");

  await expect(page.getByText("Cross-midnight shift")).toBeVisible();
  await expect(page.getByText("Tip-out cannot be higher than total income.")).toBeVisible();

  await page.getByRole("button", { name: "Calculation details" }).click();
  await expect(page.getByText(/Effective hours: 3/)).toBeVisible();
});
