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
  await expect(page.getByText("Tips Calendar")).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous month" })).toHaveText("");
  await expect(page.getByRole("button", { name: "Next month" })).toHaveText("");
  await expect(page.getByRole("heading", { name: "Restaurant settings" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Export and backup" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Record Shift" })).toHaveCount(0);
});

test("Calendar home uses white canvas and Figma-style selected date treatment", async ({ page }) => {
  await page.goto("/");

  const bodyBackground = await page.locator("body").evaluate((node) => getComputedStyle(node).backgroundColor);
  const appShell = page.locator("main");
  const appBackground = await appShell.evaluate((node) => getComputedStyle(node).backgroundColor);
  const appPaddingTop = await appShell.evaluate((node) => parseFloat(getComputedStyle(node).paddingTop));
  const appAlignContent = await appShell.evaluate((node) => getComputedStyle(node).alignContent);
  const appGridAutoRows = await appShell.evaluate((node) => getComputedStyle(node).gridAutoRows);
  const appFlexGrow = await appShell.evaluate((node) => getComputedStyle(node).flexGrow);
  const calendarGap = await page.locator(".calendar-panel").evaluate((node) => parseFloat(getComputedStyle(node).gap));
  const navPosition = await page
    .getByRole("navigation", { name: "Primary" })
    .evaluate((node) => getComputedStyle(node).position);
  const navBottom = await page
    .getByRole("navigation", { name: "Primary" })
    .evaluate((node) => getComputedStyle(node).bottom);
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
  expect(appAlignContent).toBe("start");
  expect(appGridAutoRows).toBe("max-content");
  expect(appFlexGrow).toBe("0");
  expect(calendarGap).toBeGreaterThanOrEqual(12);
  expect(calendarGap).toBeLessThanOrEqual(16);
  expect(navPosition).toBe("fixed");
  expect(navBottom).toBe("0px");
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
  await expect(page.getByTestId("day-detail-scrim")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Record Shift" })).toHaveCount(0);
  await expect(page.getByLabel("Day detail").getByText("Net Income")).toBeVisible();
  await expect(page.getByLabel("Day detail").getByText("$262.50")).toBeVisible();
});

test("recorded calendar dates open a modal Day Details sheet that can close", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "tip-calendar:v1",
      JSON.stringify({
        version: 1,
        demoSeededAt: "2026-08-24T00:00:00.000Z",
        restaurant: {
          id: "olive-garden",
          name: "The Olive Garden",
          payType: "hourly",
          payAmount: 12.5,
          creditTipPayout: "sameDay",
          defaultTipOut: { type: "none" },
        },
        defaultRestaurantId: "olive-garden",
        restaurants: [
          {
            id: "olive-garden",
            name: "The Olive Garden",
            payType: "hourly",
            payAmount: 12.5,
            creditTipPayout: "sameDay",
            defaultTipOut: { type: "none" },
          },
        ],
        shifts: [
          {
            id: "dinner-shift",
            date: "2025-08-21",
            restaurantId: "olive-garden",
            hours: 6.5,
            useClock: true,
            clockIn: "18:00",
            clockOut: "00:30",
            unpaidBreak: 0,
            cashTips: 80,
            creditTips: 190,
            otherIncome: 0,
            manualTipOut: 32,
            salesAmount: 0,
            tipOutRuleSnapshot: { type: "none" },
            notes: "",
            createdAt: "2025-08-21T18:00:00.000Z",
            updatedAt: "2025-08-21T18:00:00.000Z",
          },
        ],
      }),
    );
  });

  await page.goto("/");

  const recordedDate = "2025-08-21";
  for (let index = 0; index < 12; index += 1) {
    await page.getByRole("button", { name: "Previous month" }).click();
  }
  await page.getByRole("button", { name: `Select ${recordedDate}` }).click();

  const daySheet = page.getByRole("dialog", { name: `Day detail ${recordedDate}` });
  await expect(daySheet).toBeVisible();
  await expect(daySheet).toHaveAttribute("aria-modal", "true");
  await expect(daySheet).toBeFocused();
  await expect(page.getByTestId("day-detail-scrim")).toBeVisible();
  await expect(page.locator(".sheet-handle")).toBeVisible();
  const sheetLayout = await daySheet.evaluate((node) => {
    const sheet = node as HTMLElement;
    const handle = sheet.querySelector<HTMLElement>(".sheet-handle");
    const heading = sheet.querySelector<HTMLElement>(".day-sheet-heading");
    const card = sheet.querySelector<HTMLElement>(".shift-detail-card");
    const cta = Array.from(sheet.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.trim() === "Edit Shift",
    );

    return {
      display: getComputedStyle(sheet).display,
      cardBackground: card ? getComputedStyle(card).backgroundColor : "",
      cardBorder: card ? getComputedStyle(card).borderTopStyle : "",
      rows: [handle, heading, card, cta].map((element) => element?.getBoundingClientRect().top ?? null),
    };
  });
  expect(sheetLayout.display).toBe("flex");
  expect(sheetLayout.cardBackground).toBe("rgb(255, 255, 255)");
  expect(sheetLayout.cardBorder).toBe("solid");
  expect(sheetLayout.rows.every((row): row is number => row !== null)).toBe(true);
  expect(sheetLayout.rows).toEqual([...sheetLayout.rows].sort((a, b) => a - b));
  await expect(daySheet.getByRole("heading", { name: "Thursday, August 21" })).toBeVisible();
  await expect(daySheet.getByText("Dinner Shift")).toBeVisible();
  await expect(daySheet.getByText("The Olive Garden")).toBeVisible();
  await expect(daySheet.getByText("6.5 hrs", { exact: true })).toBeVisible();
  await expect(daySheet.getByText("6:00 PM – 12:30 AM (Aug 22)")).toBeVisible();
  await expect(daySheet.getByText("Cash tips")).toBeVisible();
  await expect(daySheet.getByText("$80.00")).toBeVisible();
  await expect(daySheet.getByText("Credit card tips")).toBeVisible();
  await expect(daySheet.getByText("$190.00")).toBeVisible();
  await expect(daySheet.getByText("Hourly wage")).toBeVisible();
  await expect(daySheet.getByText("6.5 hrs x $12.50/hr")).toBeVisible();
  await expect(daySheet.getByText("$81.25")).toBeVisible();
  await expect(daySheet.getByText("Tip-out")).toBeVisible();
  await expect(daySheet.getByText("-$32.00")).toBeVisible();
  await expect(daySheet.getByText("Net Income")).toBeVisible();
  await expect(daySheet.getByText("$319.25")).toBeVisible();
  await expect(daySheet.getByRole("button", { name: "Edit Shift" })).toBeVisible();
  await expect(daySheet.getByRole("button", { name: "Record Shift" })).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(daySheet).toHaveCount(0);
  await expect(page.getByTestId("day-detail-scrim")).toHaveCount(0);

  await page.getByRole("button", { name: `Select ${recordedDate}` }).click();
  await expect(daySheet).toBeVisible();
  await page.getByTestId("day-detail-scrim").click({ position: { x: 10, y: 10 } });
  await expect(daySheet).toHaveCount(0);

  await page.getByRole("button", { name: `Select ${recordedDate}` }).click();
  await daySheet.getByRole("button", { name: "Edit Shift" }).click();
  await expect(page.getByRole("heading", { name: "Record Shift" })).toBeVisible();
  await expect(page.getByLabel("Cash tips")).toHaveValue("80");
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
