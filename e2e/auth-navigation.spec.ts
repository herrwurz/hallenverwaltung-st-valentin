import { expect, test } from "@playwright/test";
import { e2eUsers } from "./fixtures";
import { expectLoggedInArea, login } from "./helpers";

test("invalid login shows a clear error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(e2eUsers.admin.email);
  await page.getByLabel("Passwort").fill("wrong-password");
  await page.getByRole("button", { name: "Anmelden" }).click();

  await expect(page.getByText("E-Mail-Adresse oder Passwort ist nicht korrekt.")).toBeVisible();
});

test("protected admin pages redirect unauthenticated users to login", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Hallenverwaltung" })).toBeVisible();
});

test("municipal admin is redirected to the admin dashboard", async ({ page }) => {
  await login(page, e2eUsers.admin.email, e2eUsers.admin.password);

  await expectLoggedInArea(page, /\/admin$/, "Stammdatenverwaltung");
  await page.getByRole("link", { name: "System-Jobs" }).click();
  await expectLoggedInArea(page, /\/admin\/system\/jobs/, "System-Jobs");
});

test("portal user is redirected to the organization portal", async ({ page }) => {
  await login(page, e2eUsers.portal.email, e2eUsers.portal.password);

  await expectLoggedInArea(page, /\/portal$/, "Organisationsportal");
  await expect(page.getByRole("link", { name: "Buchungsantraege" })).toBeVisible();
});
