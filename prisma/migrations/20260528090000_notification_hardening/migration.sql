ALTER TABLE "Notification"
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "nextAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastError" TEXT;

UPDATE "Notification"
SET "lastError" = "errorMessage"
WHERE "errorMessage" IS NOT NULL;

CREATE INDEX "Notification_status_nextAttemptAt_idx" ON "Notification"("status", "nextAttemptAt");
