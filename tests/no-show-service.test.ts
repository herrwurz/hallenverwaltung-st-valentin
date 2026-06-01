import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getNoShowStatusLabel } from "../lib/no-show-status";
import { BookingValidationError } from "../lib/services/booking-rules";
import {
  assertNoShowAcknowledgeTransition,
  assertNoShowReportPermission,
  isAssignedCaretakerForBooking,
  noShowAcknowledgeSchema,
  noShowReportSchema,
} from "../lib/services/no-show-service";

const assignedBooking = {
  room: {
    caretakers: [{ caretaker: { email: "wart@example.test" } }],
    building: { caretakers: [{ caretaker: { email: "building@example.test" } }] },
  },
};

test("validates no-show report input", () => {
  const report = noShowReportSchema.parse({
    bookingId: "booking-1",
    description: "Verein ist nicht erschienen, Halle blieb ungenutzt.",
  });

  assert.equal(report.bookingId, "booking-1");
  assert.throws(() => noShowReportSchema.parse({ bookingId: "booking-1", description: "" }));
});

test("detects assigned caretakers by room or building email", () => {
  assert.equal(isAssignedCaretakerForBooking("wart@example.test", assignedBooking), true);
  assert.equal(isAssignedCaretakerForBooking("BUILDING@example.test", assignedBooking), true);
  assert.equal(isAssignedCaretakerForBooking("other@example.test", assignedBooking), false);
});

test("allows admins and assigned caretakers to report no-shows", () => {
  assert.doesNotThrow(() =>
    assertNoShowReportPermission({
      permissions: { canReportNoShow: true, canViewBookings: true },
      actorEmail: "other@example.test",
      booking: assignedBooking,
    }),
  );
  assert.doesNotThrow(() =>
    assertNoShowReportPermission({
      permissions: { canReportNoShow: true, canViewBookings: false },
      actorEmail: "wart@example.test",
      booking: assignedBooking,
    }),
  );
});

test("blocks no-show reports without permission or assignment", () => {
  assert.throws(
    () =>
      assertNoShowReportPermission({
        permissions: { canReportNoShow: false, canViewBookings: true },
        actorEmail: "wart@example.test",
        booking: assignedBooking,
      }),
    BookingValidationError,
  );
  assert.throws(
    () =>
      assertNoShowReportPermission({
        permissions: { canReportNoShow: true, canViewBookings: false },
        actorEmail: "other@example.test",
        booking: assignedBooking,
      }),
    BookingValidationError,
  );
});

test("validates no-show acknowledgement workflow", () => {
  assert.equal(noShowAcknowledgeSchema.parse({ noShowReportId: "no-show-1" }).noShowReportId, "no-show-1");
  assert.doesNotThrow(() => assertNoShowAcknowledgeTransition("REPORTED"));
  assert.throws(() => assertNoShowAcknowledgeTransition("ACKNOWLEDGED"), BookingValidationError);
});

test("labels no-show statuses and documents schema indexes", () => {
  assert.equal(getNoShowStatusLabel("REPORTED"), "Gemeldet");
  assert.equal(getNoShowStatusLabel("ACKNOWLEDGED"), "Zur Kenntnis genommen");

  const schema = readFileSync("prisma/schema.prisma", "utf8");
  assert.match(schema, /enum NoShowStatus/);
  assert.match(schema, /model NoShowReport/);
  assert.match(schema, /@@index\(\[status, reportedAt\]\)/);
  assert.match(schema, /@@index\(\[roomId, reportedAt\]\)/);
  assert.match(schema, /@@index\(\[organizationId, reportedAt\]\)/);
});
