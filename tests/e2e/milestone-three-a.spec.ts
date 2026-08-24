import { expect, test } from "@playwright/test";

test("mobile calendar shows daily, week, and month summaries for same-day shifts", async ({ page }) => {
  await page.goto("/");

  const today = await page.getByTestId("selected-date").textContent();
  if (!today) throw new Error("selected date missing");

  await page.getByRole("button", { name: "Record Shift" }).click();
  await page.getByLabel("Work hours").fill("4");
  await page.getByLabel("Cash tips").fill("20");
  await page.getByLabel("Credit card tips").fill("80");
  await page.getByLabel("Manual tip-out").fill("10");
  await page.getByRole("button", { name: "Save shift" }).click();

  await page.getByRole("button", { name: "Record Shift" }).click();
  await page.getByLabel("Work hours").fill("5");
  await page.getByLabel("Cash tips").fill("40");
  await page.getByLabel("Credit card tips").fill("120");
  await page.getByRole("button", { name: "Save shift" }).click();

  await expect(page.getByTestId(`calendar-net-${today}`)).toContainText("$362.50");
  await expect(page.getByLabel("Day detail").getByText("2 shifts")).toBeVisible();
  await expect(page.getByText("Day net $362.50")).toBeVisible();
  await expect(page.getByText("Week net $362.50")).toBeVisible();
  await expect(page.getByText("Month net $362.50")).toBeVisible();
});

test("mobile day detail handles empty dates, edit entry, and cross-midnight badges", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /Next month/ }).click();
  const selected = await page.getByTestId("selected-date").textContent();
  if (!selected) throw new Error("selected date missing");
  await page.getByRole("button", { name: `Select ${selected}` }).click();
  await expect(page.getByText("This day has no shifts yet.")).toBeVisible();

  await page.getByRole("button", { name: "Record Shift" }).click();
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
