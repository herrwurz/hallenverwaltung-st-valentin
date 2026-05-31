import { expect, test } from "@playwright/test";
import { e2eUsers } from "./fixtures";
import { login } from "./helpers";

test("admin can manually process the notification queue", async ({ page }) => {
  await login(page, e2eUsers.admin.email, e2eUsers.admin.password);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/system/jobs", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "System-Jobs" })).toBeVisible();
  await page.getByRole("button", { name: "Queue verarbeiten" }).click();

  await expect(page).toHaveURL(/job=notificationQueue/);
  await expect(page.getByText(/Job notificationQueue ausgefuehrt/)).toBeVisible();
  await expect(page.getByText("Letzte Ausfuehrungen")).toBeVisible();
});
