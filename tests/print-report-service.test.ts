import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getDailyOccupancyReport,
  getMonthlyOverviewReport,
  getOrganizationOverviewReport,
  getWeeklyPlanReport,
} from "../lib/services/print-report-service";

const periodStart = new Date("2026-07-06T00:00:00.000Z");
const periodEnd = new Date("2026-07-13T00:00:00.000Z");

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: "booking-1",
    title: "Training",
    status: "APPROVED",
    startsAt: new Date("2026-07-06T18:00:00.000Z"),
    endsAt: new Date("2026-07-06T19:00:00.000Z"),
    organizationId: "organization-1",
    organization: { name: "ESV ASKÖ St. Valentin" },
    usageType: { name: "Training" },
    room: {
      id: "room-1",
      name: "Turnsaal",
      building: { id: "building-1", name: "Volksschule Langenhart" },
    },
    ...overrides,
  };
}

function makeClosure(overrides: Record<string, unknown> = {}) {
  return {
    id: "closure-1",
    status: "CLOSED",
    reason: "Reinigung",
    startsAt: new Date("2026-07-07T00:00:00.000Z"),
    endsAt: new Date("2026-07-08T00:00:00.000Z"),
    buildingId: "building-1",
    roomId: null,
    building: { name: "Volksschule Langenhart" },
    room: null,
    ...overrides,
  };
}

function createClient() {
  const bookings = [
    makeBooking(),
    makeBooking({
      id: "booking-2",
      status: "REQUESTED",
      startsAt: new Date("2026-07-08T17:00:00.000Z"),
      endsAt: new Date("2026-07-08T18:00:00.000Z"),
      title: "Kurs",
    }),
    makeBooking({
      id: "booking-3",
      status: "CANCELLED",
      startsAt: new Date("2026-07-08T19:00:00.000Z"),
      endsAt: new Date("2026-07-08T20:00:00.000Z"),
      title: "Storniert",
    }),
  ];
  const closures = [makeClosure()];

  return {
    room: {
      async findUnique() {
        return { buildingId: "building-1" };
      },
    },
    booking: {
      async findMany(args: { where: Record<string, unknown> }) {
        return bookings.filter((booking) => {
          const status = args.where.status as { in?: string[] } | string | undefined;
          const statusMatches = typeof status === "string" ? booking.status === status : (status?.in ?? []).includes(booking.status);
          return statusMatches && booking.startsAt < (args.where.startsAt as { lt: Date }).lt && booking.endsAt > (args.where.endsAt as { gt: Date }).gt;
        });
      },
    },
    closure: {
      async findMany() {
        return closures;
      },
    },
    organization: {
      async findMany() {
        return [
          {
            id: "organization-1",
            name: "ESV ASKÖ St. Valentin",
            status: "ACTIVE",
            organizationType: { name: "Verein" },
            contacts: [
              {
                name: "Max Muster",
                function: "Obmann",
                email: "max@example.test",
                phone: "0664 123",
                isPrimary: true,
              },
            ],
          },
        ];
      },
    },
    building: {
      async findMany() {
        return [];
      },
    },
  };
}

test("daily occupancy report contains active bookings and closures", async () => {
  const report = await getDailyOccupancyReport({ periodStart, periodEnd }, createClient() as never);

  assert.equal(report.bookings.length, 2);
  assert.equal(report.bookings[0]?.title, "Training");
  assert.equal(report.closures.length, 1);
  assert.equal(report.closures[0]?.reason, "Reinigung");
});

test("weekly plan groups bookings and closures by day", async () => {
  const report = await getWeeklyPlanReport({ periodStart, periodEnd }, createClient() as never);

  assert.equal(report.days.length, 7);
  assert.equal(report.days[0]?.bookings.length, 1);
  assert.equal(report.days[1]?.closures.length, 1);
  assert.equal(report.days[2]?.bookings.length, 1);
});

test("monthly overview counts statuses and closures per day", async () => {
  const report = await getMonthlyOverviewReport({ periodStart, periodEnd }, createClient() as never);

  assert.equal(report.days[0]?.approvedCount, 1);
  assert.equal(report.days[2]?.requestedCount, 1);
  assert.equal(report.days[1]?.closureCount, 1);
});

test("organization overview contains contacts and organization bookings", async () => {
  const report = await getOrganizationOverviewReport({ periodStart, periodEnd }, createClient() as never);

  assert.equal(report.organizations.length, 1);
  assert.equal(report.organizations[0]?.contacts[0]?.name, "Max Muster");
  assert.equal(report.organizations[0]?.bookings.length, 2);
});

test("admin reports page is protected and offers printable report types", () => {
  const page = readFileSync("app/admin/reports/page.tsx", "utf8");
  const printPage = readFileSync("app/admin/reports/print/page.tsx", "utf8");
  const navigation = readFileSync("components/admin-navigation.tsx", "utf8");
  const adminShell = readFileSync("components/admin-shell.tsx", "utf8");

  assert.match(page, /requirePermission\("VIEW_BOOKINGS"\)/);
  assert.match(page, /Tagesbelegung/);
  assert.match(page, /Wochenplan/);
  assert.match(page, /Monatsübersicht/);
  assert.match(page, /Vereinsübersicht/);
  assert.match(page, /\/admin\/reports\/print/);
  assert.match(printPage, /requirePermission\("VIEW_BOOKINGS"\)/);
  assert.match(printPage, /print-report/);
  assert.match(printPage, /@page \{ size: A4/);
  assert.match(printPage, /Jetzt drucken/);
  assert.match(navigation, /\/admin\/reports/);
  assert.match(navigation, /Berichte/);
  assert.match(navigation, /group\.groupLabel === "Buchungen"/);
  assert.match(adminShell, /print:hidden/);
});
