-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('ACTIVE', 'RESTRICTED', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "BookingKind" AS ENUM ('SINGLE', 'SERIES_OCCURRENCE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'REQUESTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'MOVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClosureStatus" AS ENUM ('OPEN', 'RESTRICTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'OFFERED', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('NOT_RELEVANT', 'OPEN', 'EXPORTED', 'BILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DamageStatus" AS ENUM ('REPORTED', 'IN_REVIEW', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('HOUSE_RULES', 'USAGE_CONTRACT', 'INSURANCE_CERTIFICATE', 'EVENT_PERMIT', 'OTHER');

-- CreateEnum
CREATE TYPE "AccessMediumType" AS ENUM ('KEY', 'RFID_CARD', 'ELECTRONIC_ACCESS');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("userId","permissionId")
);

-- CreateTable
CREATE TABLE "OrganizationType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "OrganizationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationTypeId" TEXT NOT NULL,
    "tariffGroupId" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "blockedReason" TEXT,
    "canRequestBookings" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "function" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationContact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "function" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrganizationContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "RoomStatus" NOT NULL DEFAULT 'ACTIVE',
    "isCombinable" BOOLEAN NOT NULL DEFAULT false,
    "openingTime" TEXT NOT NULL DEFAULT '06:00',
    "closingTime" TEXT NOT NULL DEFAULT '23:00',
    "setupBufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "teardownBufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "maximumBookingMinutes" INTEGER,
    "singleBookingLeadDays" INTEGER NOT NULL DEFAULT 180,
    "costCenter" TEXT,
    "publicShowOrganization" BOOLEAN NOT NULL DEFAULT true,
    "publicShowEventName" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomComposition" (
    "parentRoomId" TEXT NOT NULL,
    "childRoomId" TEXT NOT NULL,

    CONSTRAINT "RoomComposition_pkey" PRIMARY KEY ("parentRoomId","childRoomId")
);

-- CreateTable
CREATE TABLE "Caretaker" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Caretaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildingCaretaker" (
    "buildingId" TEXT NOT NULL,
    "caretakerId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BuildingCaretaker_pkey" PRIMARY KEY ("buildingId","caretakerId")
);

-- CreateTable
CREATE TABLE "RoomCaretaker" (
    "roomId" TEXT NOT NULL,
    "caretakerId" TEXT NOT NULL,

    CONSTRAINT "RoomCaretaker_pkey" PRIMARY KEY ("roomId","caretakerId")
);

-- CreateTable
CREATE TABLE "UsageType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "mayDisplaceLowerPriority" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UsageType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingSeries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "usageTypeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3) NOT NULL,
    "recurrenceRule" TEXT NOT NULL,

    CONSTRAINT "BookingSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "usageTypeId" TEXT NOT NULL,
    "seriesId" TEXT,
    "requestedByUserId" TEXT,
    "processedByUserId" TEXT,
    "kind" "BookingKind" NOT NULL DEFAULT 'SINGLE',
    "status" "BookingStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "blockedFrom" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3) NOT NULL,
    "cancellationNote" TEXT,
    "decisionNote" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingStatusHistory" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "oldStatus" "BookingStatus" NOT NULL,
    "newStatus" "BookingStatus" NOT NULL,
    "reason" TEXT,
    "oldStartAt" TIMESTAMP(3),
    "oldEndAt" TIMESTAMP(3),
    "newStartAt" TIMESTAMP(3),
    "newEndAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "usageTypeId" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "offeredAt" TIMESTAMP(3),
    "offerExpiresAt" TIMESTAMP(3),

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolidayPeriod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3) NOT NULL,
    "defaultStatus" "ClosureStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HolidayPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Closure" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT,
    "roomId" TEXT,
    "status" "ClosureStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Closure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TariffGroup" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "TariffGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tariff" (
    "id" TEXT NOT NULL,
    "tariffGroupId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "organizationTypeId" TEXT NOT NULL,
    "usageTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hourlyRate" DECIMAL(10,2),
    "flatRate" DECIMAL(10,2),
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "Tariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEntry" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tariffId" TEXT,
    "status" "BillingStatus" NOT NULL DEFAULT 'OPEN',
    "amount" DECIMAL(10,2),
    "exportedAt" TIMESTAMP(3),
    "billedAt" TIMESTAMP(3),

    CONSTRAINT "BillingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "buildingId" TEXT,
    "roomId" TEXT,
    "type" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageReport" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "reportedByUserId" TEXT,
    "processedByUserId" TEXT,
    "description" TEXT NOT NULL,
    "photoStorageKey" TEXT,
    "status" "DamageStatus" NOT NULL DEFAULT 'REPORTED',
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DamageReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handover" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "keyReceivedAt" TIMESTAMP(3),
    "roomAcceptedAt" TIMESTAMP(3),
    "roomReturnedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "Handover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessMedium" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "roomId" TEXT,
    "type" "AccessMediumType" NOT NULL,
    "identifier" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AccessMedium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessAssignment" (
    "id" TEXT NOT NULL,
    "accessMediumId" TEXT NOT NULL,
    "organizationId" TEXT,
    "issuedToName" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),

    CONSTRAINT "AccessAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "recipientUserId" TEXT,
    "eventCode" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "recipient" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationType_code_key" ON "OrganizationType"("code");

-- CreateIndex
CREATE INDEX "Organization_organizationTypeId_idx" ON "Organization"("organizationTypeId");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_activeUntil_idx" ON "OrganizationMember"("userId", "activeUntil");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_activeUntil_idx" ON "OrganizationMember"("organizationId", "activeUntil");

-- CreateIndex
CREATE UNIQUE INDEX "Building_code_key" ON "Building"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE INDEX "Room_buildingId_idx" ON "Room"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "Caretaker_code_key" ON "Caretaker"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UsageType_code_key" ON "UsageType"("code");

-- CreateIndex
CREATE INDEX "UsageType_priority_idx" ON "UsageType"("priority");

-- CreateIndex
CREATE INDEX "BookingSeries_roomId_startsOn_endsOn_idx" ON "BookingSeries"("roomId", "startsOn", "endsOn");

-- CreateIndex
CREATE INDEX "Booking_status_startsAt_idx" ON "Booking"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_roomId_startsAt_endsAt_idx" ON "Booking"("roomId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Booking_organizationId_status_idx" ON "Booking"("organizationId", "status");

-- CreateIndex
CREATE INDEX "BookingStatusHistory_bookingId_createdAt_idx" ON "BookingStatusHistory"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingStatusHistory_actorUserId_createdAt_idx" ON "BookingStatusHistory"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "WaitlistEntry_roomId_startsAt_placedAt_idx" ON "WaitlistEntry"("roomId", "startsAt", "placedAt");

-- CreateIndex
CREATE INDEX "WaitlistEntry_status_placedAt_idx" ON "WaitlistEntry"("status", "placedAt");

-- CreateIndex
CREATE INDEX "Closure_buildingId_startsAt_endsAt_idx" ON "Closure"("buildingId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Closure_roomId_startsAt_endsAt_idx" ON "Closure"("roomId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "TariffGroup_code_key" ON "TariffGroup"("code");

-- CreateIndex
CREATE INDEX "Tariff_roomId_tariffGroupId_usageTypeId_validFrom_idx" ON "Tariff"("roomId", "tariffGroupId", "usageTypeId", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "BillingEntry_bookingId_key" ON "BillingEntry"("bookingId");

-- CreateIndex
CREATE INDEX "DamageReport_roomId_status_idx" ON "DamageReport"("roomId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Handover_bookingId_key" ON "Handover"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessMedium_identifier_key" ON "AccessMedium"("identifier");

-- CreateIndex
CREATE INDEX "Notification_status_createdAt_idx" ON "Notification"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEntry_entityType_entityId_createdAt_idx" ON "AuditEntry"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_organizationTypeId_fkey" FOREIGN KEY ("organizationTypeId") REFERENCES "OrganizationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_tariffGroupId_fkey" FOREIGN KEY ("tariffGroupId") REFERENCES "TariffGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationContact" ADD CONSTRAINT "OrganizationContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomComposition" ADD CONSTRAINT "RoomComposition_parentRoomId_fkey" FOREIGN KEY ("parentRoomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomComposition" ADD CONSTRAINT "RoomComposition_childRoomId_fkey" FOREIGN KEY ("childRoomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingCaretaker" ADD CONSTRAINT "BuildingCaretaker_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildingCaretaker" ADD CONSTRAINT "BuildingCaretaker_caretakerId_fkey" FOREIGN KEY ("caretakerId") REFERENCES "Caretaker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCaretaker" ADD CONSTRAINT "RoomCaretaker_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCaretaker" ADD CONSTRAINT "RoomCaretaker_caretakerId_fkey" FOREIGN KEY ("caretakerId") REFERENCES "Caretaker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSeries" ADD CONSTRAINT "BookingSeries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSeries" ADD CONSTRAINT "BookingSeries_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSeries" ADD CONSTRAINT "BookingSeries_usageTypeId_fkey" FOREIGN KEY ("usageTypeId") REFERENCES "UsageType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_usageTypeId_fkey" FOREIGN KEY ("usageTypeId") REFERENCES "UsageType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "BookingSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_processedByUserId_fkey" FOREIGN KEY ("processedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingStatusHistory" ADD CONSTRAINT "BookingStatusHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingStatusHistory" ADD CONSTRAINT "BookingStatusHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_usageTypeId_fkey" FOREIGN KEY ("usageTypeId") REFERENCES "UsageType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Closure" ADD CONSTRAINT "Closure_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Closure" ADD CONSTRAINT "Closure_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_tariffGroupId_fkey" FOREIGN KEY ("tariffGroupId") REFERENCES "TariffGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_organizationTypeId_fkey" FOREIGN KEY ("organizationTypeId") REFERENCES "OrganizationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_usageTypeId_fkey" FOREIGN KEY ("usageTypeId") REFERENCES "UsageType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEntry" ADD CONSTRAINT "BillingEntry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEntry" ADD CONSTRAINT "BillingEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEntry" ADD CONSTRAINT "BillingEntry_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_processedByUserId_fkey" FOREIGN KEY ("processedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessMedium" ADD CONSTRAINT "AccessMedium_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessMedium" ADD CONSTRAINT "AccessMedium_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessAssignment" ADD CONSTRAINT "AccessAssignment_accessMediumId_fkey" FOREIGN KEY ("accessMediumId") REFERENCES "AccessMedium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessAssignment" ADD CONSTRAINT "AccessAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Closure must target exactly one scope: either an entire building or a room.
ALTER TABLE "Closure"
ADD CONSTRAINT "Closure_exactly_one_target_check"
CHECK (
  ("buildingId" IS NOT NULL AND "roomId" IS NULL)
  OR ("buildingId" IS NULL AND "roomId" IS NOT NULL)
);

-- Booking records and their status trail form the audit history and are immutable by deletion.
CREATE FUNCTION "reject_booking_delete"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Bookings must not be physically deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Booking_no_delete"
BEFORE DELETE ON "Booking"
FOR EACH ROW EXECUTE FUNCTION "reject_booking_delete"();

CREATE FUNCTION "reject_booking_status_history_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'BookingStatusHistory is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "BookingStatusHistory_append_only"
BEFORE UPDATE OR DELETE ON "BookingStatusHistory"
FOR EACH ROW EXECUTE FUNCTION "reject_booking_status_history_mutation"();
