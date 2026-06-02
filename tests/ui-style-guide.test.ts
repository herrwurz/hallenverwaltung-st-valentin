import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("application shells use the documented Windows style foundation", () => {
  const globals = readFileSync("app/globals.css", "utf8");
  const adminShell = readFileSync("components/admin-shell.tsx", "utf8");
  const areaShell = readFileSync("components/area-shell.tsx", "utf8");
  const adminBackLink = readFileSync("components/admin-back-link.tsx", "utf8");
  const loginPage = readFileSync("app/login/page.tsx", "utf8");
  const styleGuide = readFileSync("docs/ui-style-guide.md", "utf8");

  assert.match(globals, /\.windows-shell/);
  assert.match(globals, /\.admin-desktop/);
  assert.match(adminShell, /windows-shell admin-desktop/);
  assert.match(areaShell, /windows-shell app-area-shell/);
  assert.match(adminBackLink, /Button/);
  assert.match(adminBackLink, /variant="ghost"/);
  assert.match(loginPage, /windows-shell/);
  assert.match(styleGuide, /Windows-\/Desktop-Anmutung/);
  assert.match(styleGuide, /Google-Kalender/);
});

test("shared form actions expose shadcn-style primary and secondary actions", () => {
  const formActions = readFileSync("components/form-actions.tsx", "utf8");
  const statusFilterSelect = readFileSync("components/status-filter-select.tsx", "utf8");
  const logoutButton = readFileSync("components/logout-button.tsx", "utf8");

  assert.match(formActions, /Button/);
  assert.match(formActions, /variant="outline"/);
  assert.match(formActions, /Abbrechen/);
  assert.match(statusFilterSelect, /Button/);
  assert.match(statusFilterSelect, /border-input bg-background/);
  assert.match(logoutButton, /Button/);
  assert.match(logoutButton, /variant="outline"/);
});

test("navigation back links use the shared light Windows-style component", () => {
  const appBackLink = readFileSync("components/app-back-link.tsx", "utf8");
  const pages = [
    "app/portal/bookings/page.tsx",
    "app/portal/waitlist/page.tsx",
    "app/portal/documents/page.tsx",
    "app/portal/damages/page.tsx",
    "app/admin/waitlist/page.tsx",
    "app/admin/notifications/page.tsx",
    "app/admin/system/jobs/page.tsx",
    "app/admin/billing/page.tsx",
    "app/admin/settings/calendar/page.tsx",
  ];

  assert.match(appBackLink, /Button/);
  assert.match(appBackLink, /variant="ghost"/);

  for (const page of pages) {
    const source = readFileSync(page, "utf8");
    assert.match(source, /AppBackLink/, `${page} should use AppBackLink`);
    assert.doesNotMatch(source, /text-sky-300 hover:text-sky-200/, `${page} should not use dark text back links`);
  }
});

test("action feedback uses the shared light status component", () => {
  const appFeedback = readFileSync("components/app-feedback.tsx", "utf8");
  const adminFeedback = readFileSync("components/admin-feedback.tsx", "utf8");
  const adminBookings = readFileSync("app/admin/bookings/page.tsx", "utf8");
  const portalBookings = readFileSync("app/portal/bookings/page.tsx", "utf8");
  const portalWaitlist = readFileSync("app/portal/waitlist/page.tsx", "utf8");
  const portalDocuments = readFileSync("app/portal/documents/page.tsx", "utf8");
  const portalDamages = readFileSync("app/portal/damages/page.tsx", "utf8");

  assert.match(appFeedback, /role="status"/);
  assert.match(appFeedback, /aria-live="polite"/);
  assert.match(appFeedback, /bg-emerald-50/);
  assert.match(appFeedback, /bg-red-50/);
  assert.match(adminFeedback, /AppFeedback/);
  assert.match(adminBookings, /AppFeedback/);
  assert.match(portalBookings, /AppFeedback/);
  assert.match(portalWaitlist, /AppFeedback/);
  assert.match(portalDocuments, /AppFeedback/);
  assert.match(portalDamages, /AppFeedback/);
});

test("windows shell neutralizes old dark semantic status surfaces", () => {
  const globals = readFileSync("app/globals.css", "utf8");

  assert.match(globals, /--app-success-bg/);
  assert.match(globals, /--app-error-bg/);
  assert.match(globals, /--app-warning-bg/);
  assert.match(globals, /--app-info-bg/);
  assert.match(globals, /\[class\*="bg-emerald-950"\]/);
  assert.match(globals, /\[class\*="bg-red-950"\]/);
  assert.match(globals, /\[class\*="bg-rose-950"\]/);
  assert.match(globals, /\[class\*="bg-amber-950"\]/);
  assert.match(globals, /\[class\*="bg-sky-950"\]/);
});

test("entry and authorization pages use the deployment-ready light shell", () => {
  const homePage = readFileSync("app/page.tsx", "utf8");
  const unauthorizedPage = readFileSync("app/unauthorized/page.tsx", "utf8");

  assert.match(homePage, /windows-shell/);
  assert.match(homePage, /Öffentlicher Bereich/);
  assert.match(homePage, /Vereinsportal/);
  assert.match(homePage, /Verwaltung/);
  assert.doesNotMatch(homePage, /Phase 1/);
  assert.match(unauthorizedPage, /windows-shell/);
  assert.match(unauthorizedPage, /AppBackLink/);
  assert.doesNotMatch(unauthorizedPage, /bg-slate-950/);
});
