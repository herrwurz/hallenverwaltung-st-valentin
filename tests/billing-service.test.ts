import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { TariffDayType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  calculateBillingEntry,
  createBillingEntriesForPeriod,
  getBillableBookings,
  markBillingEntriesExported,
} from "../lib/services/billing-service";

const periodStart = new Date("2026-06-01T00:00:00Z");
const periodEnd = new Date("2026-07-01T00:00:00Z");

type BookingStatus = "REQUESTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";

function makeBooking(overrides: Partial<ReturnType<typeof makeBookingBase>> = {}) {
  return {
    ...makeBookingBase(),
    ...overrides,
  };
}

function makeBookingBase() {
  return {
    id: "booking-1",
    organizationId: "organization-1",
    roomId: "room-1",
    usageTypeId: "usage-1",
    title: "Training",
    startsAt: new Date("2026-06-10T18:00:00Z"),
    endsAt: new Date("2026-06-10T20:00:00Z"),
    status: "APPROVED" as BookingStatus,
    billingEntry: null as { id: string; status: string } | null,
    organization: {
      id: "organization-1",
      name: "Verein",
      tariffGroupId: "tariff-group-1",
      isBillingRelevant: true,
      organizationTypeId: "organization-type-1",
      organizationType: { name: "Verein" },
    },
    room: {
      id: "room-1",
      name: "Turnsaal",
      building: { name: "Volksschule Hauptplatz" },
    },
    usageType: {
      id: "usage-1",
      name: "Training",
    },
  };
}

function makeTariff(overrides: Partial<ReturnType<typeof makeTariffBase>> = {}) {
  return {
    ...makeTariffBase(),
    ...overrides,
  };
}

function makeTariffBase() {
  return {
    id: "tariff-1",
    tariffGroupId: "tariff-group-1",
    roomId: "room-1",
    organizationTypeId: "organization-type-1",
    usageTypeId: "usage-1",
    name: "Standardtarif",
    hourlyRate: new Prisma.Decimal(20) as Prisma.Decimal | null,
    flatRate: null as Prisma.Decimal | null,
    dayType: "ALL" as TariffDayType,
    validFrom: new Date("2026-01-01T00:00:00Z"),
    validUntil: null as Date | null,
  };
}

function createBillingHarness({
  bookings = [makeBooking()],
  tariffs = [makeTariff()],
  holidays = [] as Array<{ id: string }>,
} = {}) {
  const entries: Array<Record<string, unknown>> = [];

  const client = {
    booking: {
      async findMany(args: { where: Record<string, unknown> }) {
        return bookings.filter((booking) => {
          const startsAt = args.where.startsAt as { gte: Date } | undefined;
          const endsAt = args.where.endsAt as { lte: Date } | undefined;
          return (
            booking.status === "APPROVED" &&
            booking.organization.isBillingRelevant &&
            !booking.billingEntry &&
            (!startsAt || booking.startsAt >= startsAt.gte) &&
            (!endsAt || booking.endsAt <= endsAt.lte)
          );
        });
      },
      async findUnique(args: { where: { id: string } }) {
        return bookings.find((booking) => booking.id === args.where.id) ?? null;
      },
    },
    tariff: {
      async findMany(args: { where: Record<string, unknown> }) {
        const dayTypes = ((args.where.dayType as { in?: string[] } | undefined)?.in) ?? [];
        return tariffs.filter((tariff) => dayTypes.includes(tariff.dayType));
      },
    },
    holidayPeriod: {
      async findFirst() {
        return holidays[0] ?? null;
      },
    },
    billingEntry: {
      async upsert(args: { where: { bookingId: string }; create: Record<string, unknown>; select: unknown }) {
        const existing = entries.find((entry) => entry.bookingId === args.where.bookingId);
        if (existing) {
          return existing;
        }

        const booking = bookings.find((record) => record.id === args.create.bookingId)!;
        const created = {
          id: `billing-${entries.length + 1}`,
          exportedAt: null,
          billedAt: null,
          booking,
          organization: booking.organization,
          tariff: tariffs.find((tariff) => tariff.id === args.create.tariffId) ?? null,
          ...args.create,
        };
        entries.push(created);
        return created;
      },
      async findMany() {
        return entries;
      },
      async updateMany(args: { where: { id: { in: string[] }; status: string }; data: Record<string, unknown> }) {
        let count = 0;
        for (const entry of entries) {
          if (args.where.id.in.includes(String(entry.id)) && entry.status === args.where.status) {
            Object.assign(entry, args.data);
            count += 1;
          }
        }

        return { count };
      },
    },
  };

  return { client, entries };
}

test("approved bookings are billable within the selected period", async () => {
  const harness = createBillingHarness();

  const bookings = await getBillableBookings({ periodStart, periodEnd }, harness.client as never);

  assert.equal(bookings.length, 1);
  assert.equal(bookings[0]?.id, "booking-1");
});

test("non-approved bookings are not billable", async () => {
  const harness = createBillingHarness({
    bookings: [makeBooking({ status: "REQUESTED" })],
  });

  const bookings = await getBillableBookings({ periodStart, periodEnd }, harness.client as never);

  assert.equal(bookings.length, 0);
});

test("resolves tariffs by room, tariff group and usage type", async () => {
  const harness = createBillingHarness({
    tariffs: [
      makeTariff({ id: "tariff-all", name: "Allgemein", dayType: "ALL", hourlyRate: new Prisma.Decimal(10) }),
      makeTariff({ id: "tariff-weekday", name: "Wochentag", dayType: "WEEKDAY", hourlyRate: new Prisma.Decimal(15) }),
    ],
  });

  const calculation = await calculateBillingEntry("booking-1", harness.client as never);

  assert.equal(calculation.tariff?.id, "tariff-weekday");
  assert.equal(calculation.amount.toString(), "30");
  assert.equal(calculation.calculationType, "HOURLY");
});

test("allows zero-euro tariffs", async () => {
  const harness = createBillingHarness({
    tariffs: [makeTariff({ hourlyRate: new Prisma.Decimal(0), flatRate: null })],
  });

  const calculation = await calculateBillingEntry("booking-1", harness.client as never);

  assert.equal(calculation.amount.toString(), "0");
  assert.equal(calculation.calculationType, "ZERO");
});

test("supports flat tariffs", async () => {
  const harness = createBillingHarness({
    tariffs: [makeTariff({ hourlyRate: null, flatRate: new Prisma.Decimal(42) })],
  });

  const calculation = await calculateBillingEntry("booking-1", harness.client as never);

  assert.equal(calculation.amount.toString(), "42");
  assert.equal(calculation.calculationType, "FLAT");
});

test("filters billable bookings by period", async () => {
  const harness = createBillingHarness({
    bookings: [makeBooking({ startsAt: new Date("2026-08-01T18:00:00Z"), endsAt: new Date("2026-08-01T20:00:00Z") })],
  });

  const bookings = await getBillableBookings({ periodStart, periodEnd }, harness.client as never);

  assert.equal(bookings.length, 0);
});

test("creates billing entries and marks them exported", async () => {
  const harness = createBillingHarness();

  const result = await createBillingEntriesForPeriod(
    { periodStart, periodEnd, actorUserId: "user-admin" },
    harness.client as never,
    { canExport: true },
  );
  assert.equal(result.entries.length, 1);
  assert.equal(harness.entries[0]?.status, "OPEN");

  const exported = await markBillingEntriesExported(
    {
      entryIds: ["billing-1"],
      actorUserId: "user-admin",
      exportedAt: new Date("2026-07-02T12:00:00Z"),
    },
    harness.client as never,
    { canExport: true },
  );

  assert.equal(exported.count, 1);
  assert.equal(harness.entries[0]?.status, "EXPORTED");
  assert.deepEqual(harness.entries[0]?.exportedAt, new Date("2026-07-02T12:00:00Z"));
});

test("requires BILLING_EXPORT permission for billing mutations", async () => {
  const harness = createBillingHarness();

  await assert.rejects(
    createBillingEntriesForPeriod(
      { periodStart, periodEnd, actorUserId: "user-without-export" },
      harness.client as never,
      { canExport: false },
    ),
    /Abrechnungsdaten/,
  );
});

test("does not change already exported billing entries", async () => {
  const harness = createBillingHarness();
  await createBillingEntriesForPeriod(
    { periodStart, periodEnd, actorUserId: "user-admin" },
    harness.client as never,
    { canExport: true },
  );
  harness.entries[0]!.status = "EXPORTED";
  harness.entries[0]!.exportedAt = new Date("2026-07-01T12:00:00Z");

  const exported = await markBillingEntriesExported(
    {
      entryIds: ["billing-1"],
      actorUserId: "user-admin",
      exportedAt: new Date("2026-07-02T12:00:00Z"),
    },
    harness.client as never,
    { canExport: true },
  );

  assert.equal(exported.count, 0);
  assert.deepEqual(harness.entries[0]?.exportedAt, new Date("2026-07-01T12:00:00Z"));
});

test("rejects conflicting overlapping tariffs", async () => {
  const harness = createBillingHarness({
    tariffs: [
      makeTariff({ id: "tariff-1", dayType: "WEEKDAY", validFrom: new Date("2026-01-01T00:00:00Z"), validUntil: new Date("2026-12-31T00:00:00Z") }),
      makeTariff({ id: "tariff-2", dayType: "WEEKDAY", validFrom: new Date("2026-06-01T00:00:00Z"), validUntil: null }),
    ],
  });

  await assert.rejects(calculateBillingEntry("booking-1", harness.client as never), /widerspruechliche Tarife/);
});

test("non-billing-relevant organizations do not create billing entries", async () => {
  const harness = createBillingHarness({
    bookings: [
      makeBooking({
        organization: {
          ...makeBookingBase().organization,
          isBillingRelevant: false,
        },
      }),
    ],
  });

  const result = await createBillingEntriesForPeriod(
    { periodStart, periodEnd, actorUserId: "user-admin" },
    harness.client as never,
    { canExport: true },
  );

  assert.equal(result.entries.length, 0);
  assert.equal(harness.entries.length, 0);
});

test("billing indexes are present in the Prisma schema", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");

  assert.match(schema, /@@index\(\[status, periodStart\]\)/);
  assert.match(schema, /@@index\(\[organizationId, periodStart\]\)/);
  assert.match(schema, /@@index\(\[exportedAt\]\)/);
});
