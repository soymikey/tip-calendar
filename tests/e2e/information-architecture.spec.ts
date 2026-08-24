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

test("empty calendar dates open a new Record Shift form directly", async ({ page }) => {
  await page.goto("/");

  const emptyDate = "2026-08-10";
  await expect(page.getByRole("dialog", { name: /Day detail/ })).toHaveCount(0);

  await page.getByRole("button", { name: `Select ${emptyDate}` }).click();
  await expect(page.getByRole("heading", { name: "Record Shift" })).toBeVisible();
  await expect(page.getByText(emptyDate)).toBeVisible();
  await expect(page.getByLabel("Work hours")).toBeVisible();
  await expect(page.getByLabel("Clock in", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: /Day detail/ })).toHaveCount(0);

  await page.getByLabel("Work hours").fill("5");
  await page.getByLabel("Cash tips").fill("40");
  await page.getByLabel("Credit card tips").fill("160");
  await page.getByRole("button", { name: "Save shift" }).click();

  await expect(page.getByRole("dialog", { name: `Day detail ${emptyDate}` })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Record Shift" })).toHaveCount(0);
  await expect(page.getByLabel("Day detail").getByText("Net income $262.50")).toBeVisible();
});

test("recorded calendar dates open the Day Details sheet with edit and add actions", async ({ page }) => {
  await page.goto("/");

  const recordedDate = "2026-08-11";
  await page.getByRole("button", { name: `Select ${recordedDate}` }).click();
  await page.getByLabel("Work hours").fill("4");
  await page.getByLabel("Cash tips").fill("30");
  await page.getByRole("button", { name: "Save shift" }).click();

  await page.getByRole("button", { name: "Previous month" }).click();
  await page.getByRole("button", { name: "Next month" }).click();
  await page.getByRole("button", { name: `Select ${recordedDate}` }).click();

  const daySheet = page.getByRole("dialog", { name: `Day detail ${recordedDate}` });
  await expect(daySheet).toBeVisible();
  await expect(daySheet.getByText("Day net $80.00")).toBeVisible();
  await expect(daySheet.getByText("Net income $80.00")).toBeVisible();
  await expect(daySheet.getByRole("button", { name: /Edit shift/ })).toBeVisible();
  await expect(daySheet.getByRole("button", { name: "Record Shift" })).toBeVisible();

  await daySheet.getByRole("button", { name: /Edit shift/ }).click();
  await expect(page.getByRole("heading", { name: "Record Shift" })).toBeVisible();
  await expect(page.getByLabel("Cash tips")).toHaveValue("30");
});

test("Settings tab owns restaurants and data export", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "Settings" }).click();
  await expect(page.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Restaurant settings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Export and backup" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /August 2026/ })).toHaveCount(0);
});
