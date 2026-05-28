CREATE INDEX "Tariff_roomId_tariffGroupId_usageTypeId_dayType_validFrom_validUntil_idx"
ON "Tariff"("roomId", "tariffGroupId", "usageTypeId", "dayType", "validFrom", "validUntil");

CREATE INDEX "BillingEntry_status_periodStart_idx"
ON "BillingEntry"("status", "periodStart");

CREATE INDEX "BillingEntry_organizationId_periodStart_idx"
ON "BillingEntry"("organizationId", "periodStart");

CREATE INDEX "BillingEntry_exportedAt_idx"
ON "BillingEntry"("exportedAt");
