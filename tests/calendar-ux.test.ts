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
