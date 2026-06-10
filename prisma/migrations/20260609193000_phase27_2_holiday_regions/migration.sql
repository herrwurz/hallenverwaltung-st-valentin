ALTER TABLE "HolidayPeriod" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'AT';
ALTER TABLE "HolidayPeriod" ADD COLUMN "regionCode" TEXT;
CREATE INDEX "HolidayPeriod_countryCode_regionCode_startsOn_endsOn_idx" ON "HolidayPeriod"("countryCode", "regionCode", "startsOn", "endsOn");
