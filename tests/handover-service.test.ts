import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BookingValidationError } from "../lib/services/booking-rules";
import {
  assertHandoverTransition,
  getHandoverActionLabel,
  getHandoverStatus,
  getHandoverStatusLabel,
  handoverEventSchema,
} from "../lib/services/handover-service";

test("validates handover event input", () => {
  const event = handoverEventSchema.parse({
    bookingId: "booking-1",
    action: "KEY_RECEIVED",
    notes: "Schluessel im Buero uebergeben.",
  });

  assert.equal(event.bookingId, "booking-1");
  assert.equal(event.action, "KEY_RECEIVED");
  assert.throws(() => handoverEventSchema.parse({ bookingId: "booking-1", action: "UNKNOWN" }));
});

test("derives handover status from timestamps", () => {
  const now = new Date("2026-06-01T10:00:00.000Z");

  assert.equal(getHandoverStatus(null), "OPEN");
  assert.equal(getHandoverStatus({ keyReceivedAt: now, roomAcceptedAt: null, roomReturnedAt: null }), "KEY_RECEIVED");
  assert.equal(getHandoverStatus({ keyReceivedAt: now, roomAcceptedAt: now, roomReturnedAt: null }), "ROOM_ACCEPTED");
  assert.equal(getHandoverStatus({ keyReceivedAt: now, roomAcceptedAt: now, roomReturnedAt: now }), "ROOM_RETURNED");
});

test("enforces forward-only handover transitions", () => {
  const now = new Date("2026-06-01T10:00:00.000Z");

  assert.doesNotThrow(() => assertHandoverTransition(null, "KEY_RECEIVED"));
  assert.doesNotThrow(() =>
    assertHandoverTransition({ keyReceivedAt: now, roomAcceptedAt: null, roomReturnedAt: null }, "ROOM_ACCEPTED"),
  );
  assert.doesNotThrow(() =>
    assertHandoverTransition({ keyReceivedAt: now, roomAcceptedAt: now, roomReturnedAt: null }, "ROOM_RETURNED"),
  );

  assert.throws(() => assertHandoverTransition(null, "ROOM_ACCEPTED"), BookingValidationError);
  assert.throws(
    () => assertHandoverTransition({ keyReceivedAt: now, roomAcceptedAt: null, roomReturnedAt: null }, "KEY_RECEIVED"),
    BookingValidationError,
  );
  assert.throws(
    () => assertHandoverTransition({ keyReceivedAt: now, roomAcceptedAt: now, roomReturnedAt: now }, "ROOM_RETURNED"),
    BookingValidationError,
  );
});

test("labels handover states and documents permission seed", () => {
  assert.equal(getHandoverActionLabel("KEY_RECEIVED"), "Schluessel erhalten");
  assert.equal(getHandoverStatusLabel("ROOM_RETURNED"), "Halle retourniert");

  const seed = readFileSync("prisma/seed.ts", "utf8");
  const agents = readFileSync("AGENTS.md", "utf8");
  const docs = readFileSync("docs/prisma-schema-v1.md", "utf8");

  assert.match(seed, /MANAGE_HANDOVERS/);
  assert.match(agents, /Hallenuebergaben/);
  assert.match(docs, /Handover/);
});
