import { expect, test } from "@playwright/test";

test("mobile user can persist restaurant settings across refresh and reset demo data", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Restaurant settings" })).toBeVisible();
  await page.getByLabel("Restaurant name").fill("Blue Plate Diner");
  await page.getByLabel("Fixed pay per shift").check();
  await page.getByLabel("Pay amount").fill("95");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved locally.")).toBeVisible();

  await page.reload();

  await expect(page.getByLabel("Restaurant name")).toHaveValue("Blue Plate Diner");
  await expect(page.getByLabel("Pay amount")).toHaveValue("95");
  await expect(page.getByLabel("Fixed pay per shift")).toBeChecked();

  await page.getByRole("button", { name: "Reset demo data" }).click();

  await expect(page.getByLabel("Restaurant name")).toHaveValue("Sunny Table Bistro");
  await expect(page.getByText("Demo data restored.")).toBeVisible();
});
