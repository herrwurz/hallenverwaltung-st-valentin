import { expect, test } from "@playwright/test";
import { e2eCatalog, e2eUsers } from "./fixtures";
import { login, nextWeekdayDateTime } from "./helpers";

test("portal user can create a booking request", async ({ page }) => {
  const title = `E2E Buchungsantrag ${Date.now()}`;

  await login(page, e2eUsers.portal.email, e2eUsers.portal.password);
  await expect(page).toHaveURL(/\/(dashboard|portal)$/);
  await page.goto("/portal/bookings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Buchungsantraege" })).toBeVisible();

  await page.locator('select[name="organizationId"]').selectOption({ label: e2eCatalog.organizationName });
  await page
    .locator('select[name="roomId"]')
    .selectOption({ label: `${e2eCatalog.buildingName} - ${e2eCatalog.roomName}` });
  await page.locator('input[name="title"]').fill(title);
  await page.locator('select[name="usageTypeId"]').selectOption({ label: e2eCatalog.usageTypeName });
  await page.locator('input[name="startsAt"]').fill(nextWeekdayDateTime(18));
  await page.locator('input[name="endsAt"]').fill(nextWeekdayDateTime(19, 30));
  await page.locator('textarea[name="description"]').fill("E2E Smoke-Test fuer den Buchungsantrag.");
  await page.getByRole("button", { name: "Antrag absenden" }).click();

  await expect(page).toHaveURL(/\/portal\/bookings\?saved=1/);
  await expect(page.getByText("Der Buchungsantrag wurde gespeichert.")).toBeVisible();
  await expect(page.getByText(title)).toBeVisible();
});
