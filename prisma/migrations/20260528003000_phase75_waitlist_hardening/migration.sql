ALTER TABLE "Notification"
  ADD COLUMN "waitlistEntryId" TEXT,
  ADD COLUMN "payload" JSONB;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_waitlistEntryId_fkey"
  FOREIGN KEY ("waitlistEntryId") REFERENCES "WaitlistEntry"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Notification_waitlistEntryId_createdAt_idx"
  ON "Notification"("waitlistEntryId", "createdAt");

CREATE UNIQUE INDEX "WaitlistEntry_unique_active_slot_per_org"
  ON "WaitlistEntry" ("organizationId", "roomId", "startsAt", "endsAt")
  WHERE "status" IN ('ACTIVE', 'OFFERED');
