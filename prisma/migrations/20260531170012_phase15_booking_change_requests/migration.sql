-- CreateEnum
CREATE TYPE "BookingChangeRequestType" AS ENUM ('MOVE', 'SWAP');

-- CreateEnum
CREATE TYPE "BookingChangeRequestStatus" AS ENUM ('REQUESTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "BillingEntry" ALTER COLUMN "periodStart" DROP DEFAULT,
ALTER COLUMN "periodEnd" DROP DEFAULT,
ALTER COLUMN "durationMinutes" DROP DEFAULT,
ALTER COLUMN "calculationType" DROP DEFAULT;

-- CreateTable
CREATE TABLE "BookingChangeRequest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "type" "BookingChangeRequestType" NOT NULL,
    "status" "BookingChangeRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "oldRoomId" TEXT NOT NULL,
    "oldStartAt" TIMESTAMP(3) NOT NULL,
    "oldEndAt" TIMESTAMP(3) NOT NULL,
    "newRoomId" TEXT NOT NULL,
    "newStartAt" TIMESTAMP(3) NOT NULL,
    "newEndAt" TIMESTAMP(3) NOT NULL,
    "swapWithBookingId" TEXT,
    "reason" TEXT NOT NULL,
    "decisionNote" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingChangeRequest_status_createdAt_idx" ON "BookingChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BookingChangeRequest_bookingId_status_idx" ON "BookingChangeRequest"("bookingId", "status");

-- CreateIndex
CREATE INDEX "BookingChangeRequest_requestedByUserId_status_idx" ON "BookingChangeRequest"("requestedByUserId", "status");

-- CreateIndex
CREATE INDEX "BookingChangeRequest_newRoomId_newStartAt_newEndAt_idx" ON "BookingChangeRequest"("newRoomId", "newStartAt", "newEndAt");

-- AddForeignKey
ALTER TABLE "BookingChangeRequest" ADD CONSTRAINT "BookingChangeRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingChangeRequest" ADD CONSTRAINT "BookingChangeRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingChangeRequest" ADD CONSTRAINT "BookingChangeRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingChangeRequest" ADD CONSTRAINT "BookingChangeRequest_oldRoomId_fkey" FOREIGN KEY ("oldRoomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingChangeRequest" ADD CONSTRAINT "BookingChangeRequest_newRoomId_fkey" FOREIGN KEY ("newRoomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingChangeRequest" ADD CONSTRAINT "BookingChangeRequest_swapWithBookingId_fkey" FOREIGN KEY ("swapWithBookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Tariff_roomId_tariffGroupId_usageTypeId_dayType_validFrom_valid" RENAME TO "Tariff_roomId_tariffGroupId_usageTypeId_dayType_validFrom_v_idx";
