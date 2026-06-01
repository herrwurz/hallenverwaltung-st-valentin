-- Phase 19.3: Access management lookup indexes and active-assignment guard.

CREATE INDEX "AccessMedium_buildingId_isActive_idx" ON "AccessMedium"("buildingId", "isActive");
CREATE INDEX "AccessMedium_roomId_isActive_idx" ON "AccessMedium"("roomId", "isActive");
CREATE INDEX "AccessAssignment_accessMediumId_returnedAt_idx" ON "AccessAssignment"("accessMediumId", "returnedAt");
CREATE INDEX "AccessAssignment_organizationId_returnedAt_idx" ON "AccessAssignment"("organizationId", "returnedAt");

CREATE UNIQUE INDEX "AccessAssignment_one_active_per_medium"
  ON "AccessAssignment"("accessMediumId")
  WHERE "returnedAt" IS NULL;
