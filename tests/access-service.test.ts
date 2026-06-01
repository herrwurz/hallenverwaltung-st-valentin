import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getAccessMediumTypeLabel } from "../lib/access-labels";
import { BookingValidationError } from "../lib/services/booking-rules";
import {
  accessAssignmentSchema,
  accessDeactivateSchema,
  accessMediumSchema,
  accessReturnSchema,
  assertMediumCanBeIssued,
} from "../lib/services/access-service";

test("validates access medium input", () => {
  const medium = accessMediumSchema.parse({
    buildingId: "building-1",
    roomId: "",
    type: "KEY",
    identifier: "SCHL-001",
  });

  assert.equal(medium.buildingId, "building-1");
  assert.equal(medium.type, "KEY");
  assert.throws(() => accessMediumSchema.parse({ buildingId: "", type: "KEY", identifier: "1" }));
});

test("validates access assignment and return input", () => {
  const assignment = accessAssignmentSchema.parse({
    accessMediumId: "medium-1",
    organizationId: "org-1",
    issuedToName: "Max Mustermann",
  });

  assert.equal(assignment.accessMediumId, "medium-1");
  assert.equal(accessReturnSchema.parse({ assignmentId: "assignment-1" }).assignmentId, "assignment-1");
  assert.equal(accessDeactivateSchema.parse({ accessMediumId: "medium-1" }).accessMediumId, "medium-1");
  assert.throws(() => accessAssignmentSchema.parse({ accessMediumId: "medium-1", issuedToName: "" }));
});

test("blocks issuing inactive or already assigned media", () => {
  assert.doesNotThrow(() => assertMediumCanBeIssued({ isActive: true, activeAssignment: null }));
  assert.throws(() => assertMediumCanBeIssued({ isActive: false, activeAssignment: null }), BookingValidationError);
  assert.throws(
    () => assertMediumCanBeIssued({ isActive: true, activeAssignment: { id: "assignment-1" } }),
    BookingValidationError,
  );
});

test("labels access medium types and documents schema guard", () => {
  assert.equal(getAccessMediumTypeLabel("KEY"), "Schluessel");
  assert.equal(getAccessMediumTypeLabel("RFID_CARD"), "RFID-Karte");
  assert.equal(getAccessMediumTypeLabel("ELECTRONIC_ACCESS"), "Elektronischer Zutritt");

  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const migration = readFileSync(
    "prisma/migrations/20260601120000_phase19_3_access_management/migration.sql",
    "utf8",
  );
  const seed = readFileSync("prisma/seed.ts", "utf8");

  assert.match(schema, /model AccessMedium/);
  assert.match(schema, /model AccessAssignment/);
  assert.match(schema, /@@index\(\[accessMediumId, returnedAt\]\)/);
  assert.match(migration, /AccessAssignment_one_active_per_medium/);
  assert.match(seed, /MANAGE_ACCESS/);
});
