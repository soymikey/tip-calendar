import { expect, test } from "@playwright/test";

test("Calendar is the default home with only Calendar and Settings bottom tabs", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Calendar" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "false");
  await expect(page.getByRole("tab", { name: "Record Shift" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Calculator" })).toHaveCount(0);

  await expect(page.getByRole("heading", { name: /August 2026/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Restaurant settings" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Export and backup" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Record Shift" })).toHaveCount(0);
});

test("Record Shift opens from the day sheet and returns to that day after save", async ({ page }) => {
  await page.goto("/");

  const selected = await page.getByTestId("selected-date").textContent();
  if (!selected) throw new Error("selected date missing");
  await expect(page.getByRole("dialog", { name: `Day detail ${selected}` })).toBeVisible();

  await page.getByRole("button", { name: "Record Shift" }).click();
  await expect(page.getByRole("heading", { name: "Record Shift" })).toBeVisible();
  await expect(page.getByText(selected)).toBeVisible();
  await expect(page.getByLabel("Work hours")).toBeVisible();
  await expect(page.getByLabel("Clock in", { exact: true })).toHaveCount(0);

  await page.getByLabel("Work hours").fill("5");
  await page.getByLabel("Cash tips").fill("40");
  await page.getByLabel("Credit card tips").fill("160");
  await page.getByRole("button", { name: "Save shift" }).click();

  await expect(page.getByRole("dialog", { name: `Day detail ${selected}` })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Record Shift" })).toHaveCount(0);
  await expect(page.getByLabel("Day detail").getByText("Net income $262.50")).toBeVisible();
});

test("Settings tab owns restaurants and data export", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "Settings" }).click();
  await expect(page.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Restaurant settings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Export and backup" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /August 2026/ })).toHaveCount(0);
});
