import assert from "node:assert/strict";
import test from "node:test";
import { requestBooking } from "../lib/services/booking-transition-service";
import { BookingValidationError } from "../lib/services/booking-rules";
import {
  evaluateHolidayOverlap,
  generateWeeklyOccurrences,
} from "../lib/services/booking-series-service";
import { assertHolidayPeriodRange, getHolidayStatusLabel } from "../lib/services/holiday-service";

const firstStartsAt = new Date("2026-09-07T18:00:00Z");
const firstEndsAt = new Date("2026-09-07T20:00:00Z");

test("generates weekly booking occurrences up to the configured end date", () => {
  const occurrences = generateWeeklyOccurrences({
    firstStartsAt,
    firstEndsAt,
    repeatUntil: new Date("2026-09-21T23:59:59Z"),
  });

  assert.equal(occurrences.length, 3);
  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.startsAt.toISOString()),
    [
      "2026-09-07T18:00:00.000Z",
      "2026-09-14T18:00:00.000Z",
      "2026-09-21T18:00:00.000Z",
    ],
  );
});

test("rejects invalid weekly series ranges", () => {
  assert.throws(
    () =>
      generateWeeklyOccurrences({
        firstStartsAt: firstEndsAt,
        firstEndsAt,
        repeatUntil: new Date("2026-10-01T00:00:00Z"),
      }),
    BookingValidationError,
  );

  assert.throws(
    () =>
      generateWeeklyOccurrences({
        firstStartsAt,
        firstEndsAt,
        repeatUntil: new Date("2026-09-01T00:00:00Z"),
      }),
    BookingValidationError,
  );
});

test("detects closed and restricted holiday overlaps", () => {
  const holidays = [
    {
      id: "holiday-1",
      name: "Sommersperre",
      startsOn: new Date("2026-09-07T00:00:00Z"),
      endsOn: new Date("2026-09-08T00:00:00Z"),
      defaultStatus: "CLOSED" as const,
      reason: "Reinigung",
    },
    {
      id: "holiday-2",
      name: "Herbstferien",
      startsOn: new Date("2026-09-14T00:00:00Z"),
      endsOn: new Date("2026-09-15T00:00:00Z"),
      defaultStatus: "RESTRICTED" as const,
      reason: "Eingeschraenkter Betrieb",
    },
  ];

  assert.deepEqual(
    evaluateHolidayOverlap({ startsAt: firstStartsAt, endsAt: firstEndsAt }, holidays),
    {
      id: "holiday-1",
      name: "Sommersperre",
      status: "CLOSED",
      reason: "Reinigung",
    },
  );
  assert.equal(
    evaluateHolidayOverlap(
      {
        startsAt: new Date("2026-09-14T18:00:00Z"),
        endsAt: new Date("2026-09-14T20:00:00Z"),
      },
      holidays,
    )?.status,
    "RESTRICTED",
  );
});

test("validates holiday period ranges and labels", () => {
  assert.doesNotThrow(() =>
    assertHolidayPeriodRange(new Date("2026-12-24T00:00:00Z"), new Date("2027-01-07T00:00:00Z")),
  );
  assert.throws(
    () => assertHolidayPeriodRange(new Date("2026-12-24T00:00:00Z"), new Date("2026-12-24T00:00:00Z")),
    BookingValidationError,
  );
  assert.equal(getHolidayStatusLabel("OPEN"), "Geoeffnet");
  assert.equal(getHolidayStatusLabel("RESTRICTED"), "Eingeschraenkt");
  assert.equal(getHolidayStatusLabel("CLOSED"), "Gesperrt");
});

test("requestBooking persists series metadata for generated occurrences", async () => {
  const writes: Array<{ kind: string; data: Record<string, unknown> }> = [];

  await requestBooking(
    {
      actorUserId: "user-1",
      organizationId: "organization-1",
      roomId: "room-1",
      usageTypeId: "usage-1",
      seriesId: "series-1",
      kind: "SERIES_OCCURRENCE",
      title: "Serientraining",
      description: null,
      startsAt: firstStartsAt,
      endsAt: firstEndsAt,
      blockedFrom: firstStartsAt,
      blockedUntil: firstEndsAt,
    },
    {
      booking: {
        async create(args) {
          writes.push({ kind: "booking", data: args.data });
          return {
            id: "booking-1",
            organizationId: "organization-1",
            roomId: "room-1",
            requestedByUserId: "user-1",
            processedByUserId: null,
            status: "REQUESTED" as const,
            title: "Serientraining",
            description: null,
            startsAt: firstStartsAt,
            endsAt: firstEndsAt,
            blockedFrom: firstStartsAt,
            blockedUntil: firstEndsAt,
            requestedAt: firstStartsAt,
            processedAt: null,
          };
        },
        async findFirst() {
          throw new Error("not used");
        },
        async findUnique() {
          throw new Error("not used");
        },
        async updateMany() {
          throw new Error("not used");
        },
      },
      bookingStatusHistory: {
        async create(args) {
          writes.push({ kind: "history", data: args.data });
          return args.data;
        },
      },
    },
  );

  assert.equal(writes[0]?.data.seriesId, "series-1");
  assert.equal(writes[0]?.data.kind, "SERIES_OCCURRENCE");
});
