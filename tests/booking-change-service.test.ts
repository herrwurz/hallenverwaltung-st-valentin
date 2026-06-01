import assert from "node:assert/strict";
import test from "node:test";
import {
  getBookingChangeStatusLabel,
  getBookingChangeTypeLabel,
} from "../lib/booking-change-status";
import {
  bookingMoveRequestSchema,
  resolveBookingChangeFilter,
} from "../lib/services/booking-change-service";

test("validates a move request payload", () => {
  const result = bookingMoveRequestSchema.parse({
    bookingId: "booking-1",
    newRoomId: "room-2",
    newStartAt: "2026-06-01T18:00:00Z",
    newEndAt: "2026-06-01T20:00:00Z",
    reason: "Meisterschaftsspiel wurde verschoben.",
  });

  assert.equal(result.bookingId, "booking-1");
  assert.equal(result.newRoomId, "room-2");
  assert.equal(result.reason, "Meisterschaftsspiel wurde verschoben.");
  assert.ok(result.newStartAt instanceof Date);
  assert.ok(result.newEndAt instanceof Date);
});

test("requires a reason for move requests", () => {
  assert.throws(() =>
    bookingMoveRequestSchema.parse({
      bookingId: "booking-1",
      newRoomId: "room-2",
      newStartAt: "2026-06-01T18:00:00Z",
      newEndAt: "2026-06-01T20:00:00Z",
      reason: "",
    }),
  );
});

test("resolves open booking change filters", () => {
  assert.deepEqual(resolveBookingChangeFilter(undefined), ["REQUESTED", "IN_REVIEW"]);
  assert.deepEqual(resolveBookingChangeFilter("OPEN"), ["REQUESTED", "IN_REVIEW"]);
  assert.deepEqual(resolveBookingChangeFilter("REQUESTED"), ["REQUESTED"]);
  assert.deepEqual(resolveBookingChangeFilter("ALL"), [
    "REQUESTED",
    "IN_REVIEW",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
  ]);
});

test("labels change request types and statuses", () => {
  assert.equal(getBookingChangeTypeLabel("MOVE"), "Verschiebung");
  assert.equal(getBookingChangeTypeLabel("SWAP"), "Tausch");
  assert.equal(getBookingChangeStatusLabel("REQUESTED"), "Beantragt");
  assert.equal(getBookingChangeStatusLabel("IN_REVIEW"), "In Prüfung");
  assert.equal(getBookingChangeStatusLabel("APPROVED"), "Genehmigt");
  assert.equal(getBookingChangeStatusLabel("REJECTED"), "Abgelehnt");
  assert.equal(getBookingChangeStatusLabel("CANCELLED"), "Storniert");
});
