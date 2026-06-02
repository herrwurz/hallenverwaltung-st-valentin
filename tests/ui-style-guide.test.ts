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
  assert.match(adminBackLink, /border border-slate-300 bg-white/);
  assert.match(loginPage, /windows-shell/);
  assert.match(styleGuide, /Windows-\/Desktop-Anmutung/);
  assert.match(styleGuide, /Google-Kalender/);
});

test("shared form actions expose light Windows-style primary and secondary actions", () => {
  const formActions = readFileSync("components/form-actions.tsx", "utf8");

  assert.match(formActions, /bg-white/);
  assert.match(formActions, /border-blue-700 bg-blue-600/);
  assert.match(formActions, /Abbrechen/);
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

  assert.match(appBackLink, /border border-slate-300 bg-white/);

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
