import assert from "node:assert/strict";
import test from "node:test";
import { exportBillingCsv, exportBillingPdf, exportBillingXlsx } from "../lib/services/export-service";

const periodStart = new Date("2026-06-01T00:00:00Z");
const periodEnd = new Date("2026-07-01T00:00:00Z");

function amount(value: string) {
  return { toString: () => value };
}

function makeBillingRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "billing-1",
    bookingId: "booking-1",
    organizationId: "organization-1",
    status: "OPEN",
    amount: amount("40"),
    periodStart: new Date("2026-06-10T18:00:00Z"),
    periodEnd: new Date("2026-06-10T20:00:00Z"),
    durationMinutes: 120,
    unitPrice: amount("20"),
    calculationType: "HOURLY",
    exportedAt: null,
    organization: { name: "Turnverein" },
    tariff: { name: "Standardtarif", dayType: "ALL" },
    booking: {
      id: "booking-1",
      title: "Training",
      startsAt: new Date("2026-06-10T18:00:00Z"),
      endsAt: new Date("2026-06-10T20:00:00Z"),
      usageType: { name: "Training" },
      room: {
        id: "room-1",
        name: "Turnsaal",
        building: {
          id: "building-1",
          name: "Volksschule Hauptplatz",
        },
      },
    },
    ...overrides,
  };
}

function createExportHarness(records = [makeBillingRecord()]) {
  const audit: Array<Record<string, unknown>> = [];

  const client = {
    billingEntry: {
      async findMany(args: { where: Record<string, unknown> }) {
        return records.filter((record) => {
          const where = args.where;
          const booking = where.booking as { roomId?: string; room?: { buildingId?: string } } | undefined;
          return (
            (!where.organizationId || record.organizationId === where.organizationId) &&
            (!where.status || record.status === where.status) &&
            (!booking?.roomId || record.booking.room.id === booking.roomId) &&
            (!booking?.room?.buildingId || record.booking.room.building.id === booking.room.buildingId)
          );
        });
      },
      async updateMany(args: { where: { id: { in: string[] }; status: string }; data: Record<string, unknown> }) {
        let count = 0;
        for (const record of records) {
          if (args.where.id.in.includes(record.id) && record.status === args.where.status) {
            Object.assign(record, args.data);
            count += 1;
          }
        }
        return { count };
      },
    },
    auditEntry: {
      async create(args: { data: Record<string, unknown> }) {
        audit.push(args.data);
        return args.data;
      },
    },
  };

  return { client, records, audit };
}

test("CSV export contains billing data", async () => {
  const harness = createExportHarness();

  const result = await exportBillingCsv(
    { periodStart, periodEnd, actorUserId: "admin" },
    harness.client as never,
    { canExport: true },
  );

  const csv = result.content.toString("utf8");
  assert.equal(result.contentType, "text/csv; charset=utf-8");
  assert.match(csv, /Turnverein/);
  assert.match(csv, /Volksschule Hauptplatz/);
  assert.match(csv, /40.00/);
});

test("XLSX export creates a real zip-based Excel file", async () => {
  const harness = createExportHarness();

  const result = await exportBillingXlsx(
    { periodStart, periodEnd, actorUserId: "admin" },
    harness.client as never,
    { canExport: true },
  );

  assert.equal(result.contentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal(result.content.subarray(0, 2).toString("utf8"), "PK");
  assert.match(result.content.toString("latin1"), /\[Content_Types\]\.xml/);
});

test("PDF export creates a printable PDF document", async () => {
  const harness = createExportHarness();

  const result = await exportBillingPdf(
    { periodStart, periodEnd, actorUserId: "admin" },
    harness.client as never,
    { canExport: true },
  );

  assert.equal(result.contentType, "application/pdf");
  assert.equal(result.content.subarray(0, 5).toString("utf8"), "%PDF-");
  assert.match(result.content.toString("utf8"), /Monatsabrechnung/);
});

test("PDF export supports organization and room usage reports", async () => {
  const harness = createExportHarness();

  const organizationReport = await exportBillingPdf(
    { periodStart, periodEnd, actorUserId: "admin", reportType: "organization" },
    harness.client as never,
    { canExport: true },
  );
  const roomReport = await exportBillingPdf(
    { periodStart, periodEnd, actorUserId: "admin", reportType: "roomUsage" },
    harness.client as never,
    { canExport: true },
  );

  assert.match(organizationReport.content.toString("utf8"), /Vereinsübersicht/);
  assert.match(roomReport.content.toString("utf8"), /Raumbelegung/);
});

test("export filters by organization, building, room and status", async () => {
  const harness = createExportHarness([
    makeBillingRecord(),
    makeBillingRecord({
      id: "billing-2",
      organizationId: "organization-2",
      organization: { name: "Andere Organisation" },
      booking: {
        ...makeBillingRecord().booking,
        room: {
          id: "room-2",
          name: "Bewegungsraum",
          building: { id: "building-2", name: "Volksschule Langenhart" },
        },
      },
    }),
  ]);

  const result = await exportBillingCsv(
    {
      periodStart,
      periodEnd,
      actorUserId: "admin",
      organizationId: "organization-2",
      buildingId: "building-2",
      roomId: "room-2",
      status: "OPEN",
    },
    harness.client as never,
    { canExport: true },
  );

  const csv = result.content.toString("utf8");
  assert.match(csv, /Andere Organisation/);
  assert.doesNotMatch(csv, /Turnverein/);
});

test("BILLING_EXPORT permission is required for exports", async () => {
  const harness = createExportHarness();

  await assert.rejects(
    exportBillingCsv(
      { periodStart, periodEnd, actorUserId: "user-without-export" },
      harness.client as never,
      { canExport: false },
    ),
    /Abrechnungsexporte/,
  );
});

test("export can mark open entries as exported", async () => {
  const harness = createExportHarness();

  const result = await exportBillingCsv(
    { periodStart, periodEnd, actorUserId: "admin", markExported: true },
    harness.client as never,
    { canExport: true },
  );

  assert.equal(result.exportedCount, 1);
  assert.equal(harness.records[0]?.status, "EXPORTED");
  assert.ok(harness.records[0]?.exportedAt);
  assert.equal(harness.audit.length, 1);
});

test("zero-euro entries are present in exports", async () => {
  const harness = createExportHarness([
    makeBillingRecord({
      amount: amount("0"),
      unitPrice: amount("0"),
      calculationType: "ZERO",
    }),
  ]);

  const result = await exportBillingCsv(
    { periodStart, periodEnd, actorUserId: "admin" },
    harness.client as never,
    { canExport: true },
  );

  assert.match(result.content.toString("utf8"), /0.00/);
});
