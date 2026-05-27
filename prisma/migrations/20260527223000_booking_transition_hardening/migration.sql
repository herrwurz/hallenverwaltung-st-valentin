-- Allow an initial booking history entry without a previous status.
ALTER TABLE "BookingStatusHistory"
ALTER COLUMN "oldStatus" DROP NOT NULL;
