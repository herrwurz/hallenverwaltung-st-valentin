import assert from "node:assert/strict";
import test from "node:test";
import { requestBooking } from "../lib/services/booking-transition-service";
import { BookingValidationError } from "../lib/services/booking-rules";
import {
  bookingSeriesRequestSchema,
  evaluateHolidayOverlap,
  generateSeriesOccurrences,
  generateWeeklyOccurrences,
  isExcludedOccurrence,
  parseExcludedDates,
  parseWeekdays,
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

test("generates daily weekly monthly and yearly series patterns", () => {
  const daily = generateSeriesOccurrences({
    firstStartsAt,
    firstEndsAt,
    repeatUntil: new Date("2026-09-10T23:59:59Z"),
    recurrenceType: "DAILY",
    interval: 1,
    weekdays: [],
    monthlyMode: "DAY_OF_MONTH",
    excludedDates: [],
  });
  assert.equal(daily.length, 4);

  const weekly = generateSeriesOccurrences({
    firstStartsAt,
    firstEndsAt,
    repeatUntil: new Date("2026-09-16T23:59:59Z"),
    recurrenceType: "WEEKLY",
    interval: 1,
    weekdays: [1, 3],
    monthlyMode: "DAY_OF_MONTH",
    excludedDates: [],
  });
  assert.deepEqual(
    weekly.map((occurrence) => occurrence.startsAt.getDay()),
    [1, 3, 1, 3],
  );

  const monthly = generateSeriesOccurrences({
    firstStartsAt,
    firstEndsAt,
    repeatUntil: new Date("2026-12-31T23:59:59Z"),
    recurrenceType: "MONTHLY",
    interval: 1,
    weekdays: [],
    monthlyMode: "NTH_WEEKDAY",
    ordinal: "FIRST",
    weekday: 3,
    excludedDates: [],
  });
  assert.deepEqual(
    monthly.map((occurrence) => occurrence.startsAt.toISOString().slice(0, 10)),
    ["2026-10-07", "2026-11-04", "2026-12-02"],
  );

  const yearly = generateSeriesOccurrences({
    firstStartsAt,
    firstEndsAt,
    repeatUntil: new Date("2028-12-31T23:59:59Z"),
    recurrenceType: "YEARLY",
    interval: 1,
    weekdays: [],
    monthlyMode: "DAY_OF_MONTH",
    month: 6,
    dayOfMonth: 3,
    excludedDates: [],
  });
  assert.deepEqual(
    yearly.map((occurrence) => occurrence.startsAt.toISOString().slice(0, 10)),
    ["2027-06-03", "2028-06-03"],
  );
});

test("hardens series edge cases for month ends weekdays and occurrence limits", () => {
  assert.deepEqual(parseWeekdays(["1", "3", "3"]), [1, 3]);
  assert.throws(() => parseWeekdays(["9"]), BookingValidationError);

  const monthEnd = generateSeriesOccurrences({
    firstStartsAt: new Date("2026-01-31T18:00:00Z"),
    firstEndsAt: new Date("2026-01-31T20:00:00Z"),
    repeatUntil: new Date("2026-03-31T23:59:59Z"),
    recurrenceType: "MONTHLY",
    interval: 1,
    weekdays: [],
    monthlyMode: "DAY_OF_MONTH",
    dayOfMonth: 31,
    excludedDates: [],
  });
  assert.deepEqual(
    monthEnd.map((occurrence) => occurrence.startsAt.toISOString().slice(0, 10)),
    ["2026-01-31", "2026-02-28", "2026-03-31"],
  );

  const exactlyEighty = generateSeriesOccurrences({
    firstStartsAt: new Date("2026-01-01T18:00:00Z"),
    firstEndsAt: new Date("2026-01-01T20:00:00Z"),
    repeatUntil: new Date("2026-03-21T23:59:59Z"),
    recurrenceType: "DAILY",
    interval: 1,
    weekdays: [],
    monthlyMode: "DAY_OF_MONTH",
    excludedDates: [],
  });
  assert.equal(exactlyEighty.length, 80);

  assert.throws(
    () =>
      generateSeriesOccurrences({
        firstStartsAt: new Date("2026-01-01T18:00:00Z"),
        firstEndsAt: new Date("2026-01-01T20:00:00Z"),
        repeatUntil: new Date("2026-03-22T23:59:59Z"),
        recurrenceType: "DAILY",
        interval: 1,
        weekdays: [],
        monthlyMode: "DAY_OF_MONTH",
        excludedDates: [],
      }),
    /Maximal 80 Termine/,
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
      reason: "Eingeschränkter Betrieb",
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

test("parses explicit series exception dates", () => {
  const excludedDates = parseExcludedDates("2026-09-14\n2026-09-28");

  assert.equal(excludedDates.length, 2);
  assert.equal(
    isExcludedOccurrence(
      {
        startsAt: new Date(2026, 8, 14, 18, 0, 0),
        endsAt: new Date(2026, 8, 14, 20, 0, 0),
      },
      excludedDates,
    ),
    true,
  );
  assert.equal(
    isExcludedOccurrence(
      {
        startsAt: new Date(2026, 8, 21, 18, 0, 0),
        endsAt: new Date(2026, 8, 21, 20, 0, 0),
      },
      excludedDates,
    ),
    false,
  );
});

test("validates exception dates in the series schema", () => {
  const parsed = bookingSeriesRequestSchema.parse({
    organizationId: "organization-1",
    roomId: "room-1",
    usageTypeId: "usage-1",
    title: "Serientraining",
    firstStartsAt,
    firstEndsAt,
    repeatUntil: "2026-09-30",
    excludedDates: "2026-09-14",
  });

  assert.equal(parsed.excludedDates.length, 1);
  assert.throws(
    () =>
      bookingSeriesRequestSchema.parse({
        organizationId: "organization-1",
        roomId: "room-1",
        usageTypeId: "usage-1",
        title: "Serientraining",
        firstStartsAt,
        firstEndsAt,
        repeatUntil: "2026-09-30",
        excludedDates: "kein-datum",
      }),
    BookingValidationError,
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
  assert.equal(getHolidayStatusLabel("OPEN"), "Geöffnet");
  assert.equal(getHolidayStatusLabel("RESTRICTED"), "Eingeschränkt");
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
