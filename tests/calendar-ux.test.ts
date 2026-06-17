import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("calendar UI exposes FullCalendar day week month and year views", () => {
  const calendarView = readFileSync("components/calendar-view.tsx", "utf8");
  const filterForm = readFileSync("components/calendar-filter-form.tsx", "utf8");
  const adminCalendar = readFileSync("app/admin/calendar/page.tsx", "utf8");
  const portalCalendar = readFileSync("app/portal/calendar/page.tsx", "utf8");
  const publicCalendar = readFileSync("app/public/calendar/page.tsx", "utf8");
  const fullCalendarBoard = readFileSync("components/full-calendar-board.tsx", "utf8");

  assert.match(calendarView, /<FullCalendarBoard/);
  assert.match(fullCalendarBoard, /dayGridMonth/);
  assert.match(fullCalendarBoard, /timeGridWeek/);
  assert.match(fullCalendarBoard, /timeGridDay/);
  assert.match(fullCalendarBoard, /multiMonthYear/);
  assert.match(filterForm, /type="hidden" name="view" defaultValue=\{view\}/);
  assert.match(filterForm, /prepareSubmit\(\{ date: previousDate, view \}\)/);
  assert.match(filterForm, /prepareSubmit\(\{ date: today, view \}\)/);
  assert.match(filterForm, /prepareSubmit\(\{ date: nextDate, view \}\)/);
  assert.match(filterForm, /Zurück/);
  assert.match(filterForm, /Heute/);
  assert.match(filterForm, /Weiter/);
  assert.match(filterForm, /aria-pressed=\{view === option\.value\}/);
  assert.match(filterForm, /Tag/);
  assert.match(filterForm, /Woche/);
  assert.match(filterForm, /Monat/);
  assert.match(filterForm, /Jahr/);
  assert.match(adminCalendar, /view === "month" \|\| view === "year"/);
  assert.match(portalCalendar, /view === "month" \|\| view === "year"/);
  assert.match(publicCalendar, /view === "month" \|\| view === "year"/);
});

test("calendar UI exposes shadcn event detail dialogs and localized labels", () => {
  const calendarView = readFileSync("components/calendar-view.tsx", "utf8");
  const filterForm = readFileSync("components/calendar-filter-form.tsx", "utf8");
  const calendarDialog = readFileSync("components/calendar-event-dialog.tsx", "utf8");
  const fullCalendarBoard = readFileSync("components/full-calendar-board.tsx", "utf8");

  assert.match(calendarDialog, /DialogContent/);
  assert.match(calendarDialog, /Termin-Details/);
  assert.match(calendarDialog, /Gebäude/);
  assert.match(fullCalendarBoard, /DialogContent/);
  assert.match(fullCalendarBoard, /Termin-Details/);
  assert.match(calendarView, /Details anzeigen/);
  assert.match(filterForm, /Alle Räume/);
  assert.doesNotMatch(calendarView, /Gebaeude|Raeume|Eintraege|auswaehlen|gewaehl|Ã/);
});

test("calendar UI uses FullCalendar Community without duplicate header navigation buttons", () => {
  const calendarView = readFileSync("components/calendar-view.tsx", "utf8");
  const fullCalendarBoard = readFileSync("components/full-calendar-board.tsx", "utf8");
  const packageJson = readFileSync("package.json", "utf8");

  assert.match(calendarView, /FullCalendar Community/);
  assert.match(packageJson, /@fullcalendar\/react/);
  assert.match(packageJson, /@fullcalendar\/daygrid/);
  assert.match(packageJson, /@fullcalendar\/timegrid/);
  assert.match(packageJson, /@fullcalendar\/multimonth/);
  assert.match(fullCalendarBoard, /headerToolbar/);
  assert.match(fullCalendarBoard, /left: ""/);
  assert.match(fullCalendarBoard, /right: ""/);
  assert.match(fullCalendarBoard, /Heute/);
  assert.doesNotMatch(fullCalendarBoard, /prev,next today/);
  assert.doesNotMatch(fullCalendarBoard, /right: "dayGridMonth,timeGridWeek,timeGridDay,multiMonthYear"/);
  assert.match(fullCalendarBoard, /dateClick/);
  assert.match(fullCalendarBoard, /eventClick/);
  assert.doesNotMatch(fullCalendarBoard, /resourceTimeline|@fullcalendar\/resource/i);
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

test("calendar year day clicks open the clicked month context", () => {
  const fullCalendarBoard = readFileSync("components/full-calendar-board.tsx", "utf8");

  assert.match(fullCalendarBoard, /const nextView = view === "year" \? "month" : "day"/);
  assert.match(fullCalendarBoard, /formatDateInput\(arg\.date\)/);
  assert.match(fullCalendarBoard, /buildHref\(basePath, formatDateInput\(arg\.date\), nextView, filters\)/);
  assert.match(fullCalendarBoard, /window\.location\.href/);
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
    "components/calendar-event-dialog.tsx",
    "components/full-calendar-board.tsx",
    "lib/calendar-status.ts",
  ];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    assert.doesNotMatch(content, /Ã|Gebaeude|Raeume|zurueck|oeffentlich/i, file);
  }
});
