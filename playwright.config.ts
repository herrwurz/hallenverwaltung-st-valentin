import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres@localhost:55435/hallenverwaltung_phase35?schema=public";

process.env.DATABASE_URL ??= databaseUrl;
process.env.AUTH_SECRET ??= "phase-14-e2e-local-secret-change-in-real-env";
process.env.AUTH_TRUST_HOST ??= "true";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: {
    timeout: 20_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "node ./node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3000",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          DATABASE_URL: databaseUrl,
          AUTH_SECRET: process.env.AUTH_SECRET,
          AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
          CI: process.env.CI ?? "1",
          NEXT_TELEMETRY_DISABLED: "1",
        },
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
