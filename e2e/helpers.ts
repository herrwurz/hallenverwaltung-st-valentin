import { expect, type Page } from "@playwright/test";

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
}

export async function expectLoggedInArea(page: Page, pathPattern: RegExp, heading: string | RegExp) {
  await expect(page).toHaveURL(pathPattern);
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}

export function nextWeekdayDateTime(hour: number, minute = 0) {
  const value = new Date();
  value.setDate(value.getDate() + 14);
  value.setHours(hour, minute, 0, 0);

  while (value.getDay() === 0 || value.getDay() === 6) {
    value.setDate(value.getDate() + 1);
  }

  return value.toISOString().slice(0, 16);
}
