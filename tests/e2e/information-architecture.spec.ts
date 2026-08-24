import { expect, test } from "@playwright/test";

test("Calendar is the default home with only Calendar and My bottom tabs", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Calendar" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "My" })).toHaveAttribute("aria-selected", "false");
  await expect(page.getByRole("tab", { name: "Settings" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Record Shift" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Calculator" })).toHaveCount(0);

  await expect(page.getByRole("heading", { name: /August 2026/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous month" })).toHaveText("");
  await expect(page.getByRole("button", { name: "Next month" })).toHaveText("");
  await expect(page.getByRole("heading", { name: "Restaurant settings" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Export and backup" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Record Shift" })).toHaveCount(0);
});

test("Calendar home uses white canvas and Figma-style selected date treatment", async ({ page }) => {
  await page.goto("/");

  const bodyBackground = await page.locator("body").evaluate((node) => getComputedStyle(node).backgroundColor);
  const appBackground = await page.locator("main").evaluate((node) => getComputedStyle(node).backgroundColor);
  const appPaddingTop = await page.locator("main").evaluate((node) => parseFloat(getComputedStyle(node).paddingTop));
  const calendarGap = await page.locator(".calendar-panel").evaluate((node) => parseFloat(getComputedStyle(node).gap));
  const selectedDay = page.locator(".calendar-day[aria-pressed='true']").first();
  const selectedBackground = await selectedDay.evaluate((node) => getComputedStyle(node).backgroundColor);
  const selectedColor = await selectedDay.evaluate((node) => getComputedStyle(node).color);
  const defaultBorder = await page
    .getByRole("button", { name: "Select 2026-08-10" })
    .evaluate((node) => getComputedStyle(node).borderTopStyle);

  expect(bodyBackground).toBe("rgb(255, 255, 255)");
  expect(appBackground).toBe("rgba(0, 0, 0, 0)");
  expect(appPaddingTop).toBeGreaterThanOrEqual(16);
  expect(appPaddingTop).toBeLessThanOrEqual(20);
  expect(calendarGap).toBeGreaterThanOrEqual(12);
  expect(calendarGap).toBeLessThanOrEqual(16);
  expect(selectedBackground).toBe("rgb(0, 102, 204)");
  expect(selectedColor).toBe("rgb(255, 255, 255)");
  expect(defaultBorder).toBe("none");
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

test("My tab exposes separate settings, preferences, backup, and privacy views", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "My" }).click();
  const myPanelGap = await page.locator(".my-panel").evaluate((node) => parseFloat(getComputedStyle(node).gap));
  const myListGap = await page.locator(".my-list").evaluate((node) => parseFloat(getComputedStyle(node).gap));
  const firstEntry = page.getByRole("button", { name: "Restaurant settings" });
  const firstEntryMinHeight = await firstEntry.evaluate((node) => parseFloat(getComputedStyle(node).minHeight));
  const firstEntryRadius = await firstEntry.evaluate((node) => getComputedStyle(node).borderRadius);
  const firstEntryDivider = await firstEntry.evaluate((node) => getComputedStyle(node).borderBottomStyle);
  const firstEntryBackground = await firstEntry.evaluate((node) => getComputedStyle(node).backgroundColor);

  expect(myPanelGap).toBe(16);
  expect(myListGap).toBe(0);
  expect(firstEntryMinHeight).toBeGreaterThanOrEqual(44);
  expect(firstEntryMinHeight).toBeLessThanOrEqual(50);
  expect(firstEntryRadius).toBe("0px");
  expect(firstEntryDivider).toBe("solid");
  expect(firstEntryBackground).toBe("rgb(255, 255, 255)");

  await expect(page.getByRole("tab", { name: "My" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "My" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Restaurant settings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preferences" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Data & backup" })).toBeVisible();
  await expect(page.getByRole("button", { name: "About & privacy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /August 2026/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Restaurant settings" }).click();
  await expect(page.getByRole("heading", { name: "Restaurant settings" })).toBeVisible();
  await page.getByRole("button", { name: "Back to My" }).click();

  await page.getByRole("button", { name: "Preferences" }).click();
  await expect(page.getByRole("heading", { name: "Preferences" })).toBeVisible();
  await expect(page.getByLabel("Week starts on")).toBeVisible();
  await page.getByRole("button", { name: "Back to My" }).click();

  await page.getByRole("button", { name: "Data & backup" }).click();
  await expect(page.getByRole("heading", { name: "Export and backup" })).toBeVisible();
  await page.getByRole("button", { name: "Back to My" }).click();

  await page.getByRole("button", { name: "About & privacy" }).click();
  await expect(page.getByRole("heading", { name: "About & privacy" })).toBeVisible();
  await expect(page.getByText("Data stays in this browser.")).toBeVisible();
});
