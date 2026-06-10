import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("calendar UI exposes day week month and year views", () => {
  const calendarView = readFileSync("components/calendar-view.tsx", "utf8");
  const filterForm = readFileSync("components/calendar-filter-form.tsx", "utf8");
  const adminCalendar = readFileSync("app/admin/calendar/page.tsx", "utf8");
  const portalCalendar = readFileSync("app/portal/calendar/page.tsx", "utf8");
  const publicCalendar = readFileSync("app/public/calendar/page.tsx", "utf8");

  assert.match(filterForm, /option value="day"/);
  assert.match(filterForm, /option value="week"/);
  assert.match(filterForm, /option value="month"/);
  assert.match(filterForm, /option value="year"/);
  assert.match(calendarView, /Jahresansicht/);
  assert.match(adminCalendar, /view === "month" \|\| view === "year"/);
  assert.match(portalCalendar, /view === "month" \|\| view === "year"/);
  assert.match(publicCalendar, /view === "month" \|\| view === "year"/);
});

test("calendar UI exposes shadcn event detail dialogs and localized labels", () => {
  const calendarView = readFileSync("components/calendar-view.tsx", "utf8");
  const filterForm = readFileSync("components/calendar-filter-form.tsx", "utf8");
  const calendarDialog = readFileSync("components/calendar-event-dialog.tsx", "utf8");

  assert.match(calendarDialog, /DialogContent/);
  assert.match(calendarDialog, /Termin-Details/);
  assert.match(calendarDialog, /Gebäude/);
  assert.match(calendarView, /Details anzeigen/);
  assert.match(filterForm, /Alle Räume/);
  assert.doesNotMatch(calendarView, /Gebaeude|Raeume|Eintraege|auswaehlen|gewaehl|Ã/);
});

test("calendar UI exposes Google-like period navigation and resource week grid", () => {
  const calendarView = readFileSync("components/calendar-view.tsx", "utf8");

  assert.match(calendarView, /shiftCalendarDate/);
  assert.match(calendarView, /Heute/);
  assert.match(calendarView, /Zurück/);
  assert.match(calendarView, /Weiter/);
  assert.match(calendarView, /google-calendar-grid/);
  assert.match(calendarView, /Wochenplan nach Räumen/);
  assert.match(calendarView, /scheduleColumns/);
  assert.match(calendarView, /weekdayFormatter/);
  assert.match(calendarView, /Räume als Spalten/);
});

test("calendar building filter narrows room options client-side", () => {
  const calendarView = readFileSync("components/calendar-view.tsx", "utf8");
  const filterForm = readFileSync("components/calendar-filter-form.tsx", "utf8");

  assert.match(calendarView, /<CalendarFilterForm/);
  assert.match(filterForm, /useState\(filters\.buildingId/);
  assert.match(filterForm, /setSelectedBuildingId/);
  assert.match(filterForm, /setSelectedRoomId\(""\)/);
  assert.match(filterForm, /building\.id === selectedBuildingId/);
  assert.match(filterForm, /name="roomId"/);
});

test("calendar month and year views use free Google-like grid components", () => {
  const calendarView = readFileSync("components/calendar-view.tsx", "utf8");

  assert.match(calendarView, /MonthCalendarGrid/);
  assert.match(calendarView, /YearCalendarGrid/);
  assert.match(calendarView, /monthCalendarWeeks/);
  assert.match(calendarView, /yearCalendarMonths/);
  assert.match(calendarView, /grid-cols-7/);
  assert.doesNotMatch(calendarView, /FullCalendar|ScheduleX|Schedule-X|resource-scheduler/i);
});

test("admin navigation uses localized umlauts for core master data", () => {
  const adminShell = readFileSync("components/admin-shell.tsx", "utf8");
  const adminNavigation = readFileSync("components/admin-navigation.tsx", "utf8");

  assert.match(adminShell, /AdminNavigation/);
  assert.match(adminNavigation, /Buchungen|Buchungsanträge/);
  assert.match(adminNavigation, /Gebäude/);
  assert.match(adminNavigation, /Räume/);
});

test("calendar pages do not expose mojibake in visible German copy", () => {
  const files = [
    "app/admin/calendar/page.tsx",
    "app/portal/calendar/page.tsx",
    "app/public/calendar/page.tsx",
    "components/calendar-filter-form.tsx",
    "components/calendar-view.tsx",
  ];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    assert.doesNotMatch(content, /Ã|Gebaeude|Raeume|zurueck|oeffentlich/i, file);
  }
});
