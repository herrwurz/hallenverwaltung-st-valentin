import { expect, test } from "@playwright/test";

test("public overview and calendar are reachable without login", async ({ page }) => {
  await page.goto("/public");

  await expect(page.getByRole("heading", { name: "Oeffentlicher Bereich" })).toBeVisible();
  await page.getByRole("link", { name: "Kalender" }).click();

  await expect(page).toHaveURL(/\/public\/calendar/);
  await expect(page.getByRole("heading", { name: "Oeffentlicher Kalender" })).toBeVisible();
  await expect(page.getByRole("link", { name: "iCal herunterladen" })).toBeVisible();
});
