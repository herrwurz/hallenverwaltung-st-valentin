import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("calendar UI exposes day week month and year views", () => {
  const calendarView = readFileSync("components/calendar-view.tsx", "utf8");
  const adminCalendar = readFileSync("app/admin/calendar/page.tsx", "utf8");
  const portalCalendar = readFileSync("app/portal/calendar/page.tsx", "utf8");
  const publicCalendar = readFileSync("app/public/calendar/page.tsx", "utf8");

  assert.match(calendarView, /option value="day"/);
  assert.match(calendarView, /option value="week"/);
  assert.match(calendarView, /option value="month"/);
  assert.match(calendarView, /option value="year"/);
  assert.match(calendarView, /Jahresansicht/);
  assert.match(adminCalendar, /view === "month" \|\| view === "year"/);
  assert.match(portalCalendar, /view === "month" \|\| view === "year"/);
  assert.match(publicCalendar, /view === "month" \|\| view === "year"/);
});

test("calendar UI exposes event detail dialogs and localized labels", () => {
  const calendarView = readFileSync("components/calendar-view.tsx", "utf8");

  assert.match(calendarView, /role="dialog"/);
  assert.match(calendarView, /Details anzeigen/);
  assert.match(calendarView, /Termin-Details/);
  assert.match(calendarView, /Gebäude/);
  assert.match(calendarView, /Alle Räume/);
  assert.doesNotMatch(calendarView, /Gebaeude|Raeume|Eintraege|auswaehlen|gewaehl/);
});

test("admin navigation uses localized umlauts for core master data", () => {
  const adminShell = readFileSync("components/admin-shell.tsx", "utf8");

  assert.match(adminShell, /Buchungsanträge/);
  assert.match(adminShell, /Gebäude/);
  assert.match(adminShell, /Räume/);
});
