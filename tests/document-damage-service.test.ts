import assert from "node:assert/strict";
import test from "node:test";
import {
  getDamageStatusLabel,
  getDocumentTypeLabel,
} from "../lib/document-damage-labels";
import {
  assertExactlyOneDocumentTarget,
  documentMetadataSchema,
} from "../lib/services/document-service";
import {
  damageReportSchema,
  damageStatusSchema,
} from "../lib/services/damage-service";
import { BookingValidationError } from "../lib/services/booking-rules";

test("validates document metadata", () => {
  const document = documentMetadataSchema.parse({
    organizationId: "organization-1",
    type: "INSURANCE_CERTIFICATE",
    fileName: "versicherung.pdf",
    storageKey: "documents/organization-1/versicherung.pdf",
  });

  assert.equal(document.organizationId, "organization-1");
  assert.equal(document.type, "INSURANCE_CERTIFICATE");
});

test("requires exactly one document target", () => {
  assert.doesNotThrow(() => assertExactlyOneDocumentTarget({ organizationId: "organization-1" }));
  assert.throws(() => assertExactlyOneDocumentTarget({}), BookingValidationError);
  assert.throws(
    () => assertExactlyOneDocumentTarget({ organizationId: "organization-1", roomId: "room-1" }),
    BookingValidationError,
  );
});

test("validates damage report input", () => {
  const report = damageReportSchema.parse({
    roomId: "room-1",
    description: "Defekte Sprossenwand im Turnsaal.",
    photoStorageKey: "damages/sprossenwand.jpg",
  });

  assert.equal(report.roomId, "room-1");
  assert.equal(report.photoStorageKey, "damages/sprossenwand.jpg");
});

test("validates damage status transitions input", () => {
  assert.equal(
    damageStatusSchema.parse({ damageReportId: "damage-1", status: "IN_REVIEW" }).status,
    "IN_REVIEW",
  );
  assert.throws(() => damageStatusSchema.parse({ damageReportId: "damage-1", status: "CLOSED" }));
});

test("labels documents and damage statuses", () => {
  assert.equal(getDocumentTypeLabel("HOUSE_RULES"), "Hallenordnung");
  assert.equal(getDocumentTypeLabel("USAGE_CONTRACT"), "Benuetzungsvertrag");
  assert.equal(getDamageStatusLabel("REPORTED"), "Gemeldet");
  assert.equal(getDamageStatusLabel("IN_REVIEW"), "In Bearbeitung");
  assert.equal(getDamageStatusLabel("RESOLVED"), "Erledigt");
});
