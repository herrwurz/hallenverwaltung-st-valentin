import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { checkBookingConflicts } from "@/lib/services/booking-conflict-service";
import {
  assertBookingRequestPermission,
  assertOrganizationBookingAccess,
  BookingValidationError,
  validateBookingAvailability,
} from "@/lib/services/booking-rules";
import { requestBooking } from "@/lib/services/booking-transition-service";

export const bookingRequestSchema = z.object({
  organizationId: z.string().trim().min(1, "Eine Organisation ist erforderlich."),
  roomId: z.string().trim().min(1, "Ein Raum ist erforderlich."),
  usageTypeId: z.string().trim().min(1, "Ein Nutzungstyp ist erforderlich."),
  title: z.string().trim().min(2, "Ein Titel ist erforderlich.").max(160),
  description: z.string().trim().max(1000, "Die Beschreibung ist zu lang.").optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

type BookingRequestPermissionOverrides = {
  hasRequestBookingPermission?: boolean;
  isAdmin?: boolean;
};

type CreateBookingRequestOptions = {
  client?: Prisma.TransactionClient;
  now?: Date;
  permissions?: BookingRequestPermissionOverrides;
};

export function resolveBookingBlockedWindow({
  startsAt,
  endsAt,
  setupBufferMinutes,
  teardownBufferMinutes,
}: {
  startsAt: Date;
  endsAt: Date;
  setupBufferMinutes: number;
  teardownBufferMinutes: number;
}) {
  return {
    blockedFrom: new Date(startsAt.getTime() - setupBufferMinutes * 60_000),
    blockedUntil: new Date(endsAt.getTime() + teardownBufferMinutes * 60_000),
  };
}

async function resolveBookingRequestPermissions(
  actorUserId: string,
  overrides: BookingRequestPermissionOverrides = {},
) {
  const [hasRequestBookingPermission, isAdmin] = await Promise.all([
    typeof overrides.hasRequestBookingPermission === "boolean"
      ? overrides.hasRequestBookingPermission
      : hasPermission(actorUserId, "REQUEST_BOOKING"),
    typeof overrides.isAdmin === "boolean" ? overrides.isAdmin : hasPermission(actorUserId, "APPROVE_BOOKING"),
  ]);

  assertBookingRequestPermission(hasRequestBookingPermission);

  return { hasRequestBookingPermission, isAdmin };
}

async function createBookingRequestWithClient(
  data: BookingRequestInput,
  actorUserId: string,
  client: Prisma.TransactionClient,
  {
    now,
    permissions,
  }: {
    now: Date;
    permissions: Awaited<ReturnType<typeof resolveBookingRequestPermissions>>;
  },
) {
  const [organization, room, usageType, membership] = await Promise.all([
    client.organization.findUnique({
      where: { id: data.organizationId },
      select: { status: true, canRequestBookings: true },
    }),
    client.room.findUnique({
      where: { id: data.roomId },
      select: {
        status: true,
        openingTime: true,
        closingTime: true,
        maximumBookingMinutes: true,
        singleBookingLeadDays: true,
        setupBufferMinutes: true,
        teardownBufferMinutes: true,
        building: { select: { id: true, isActive: true } },
      },
    }),
    client.usageType.findUnique({
      where: { id: data.usageTypeId },
      select: { id: true },
    }),
    client.organizationMember.findFirst({
      where: {
        organizationId: data.organizationId,
        userId: actorUserId,
        activeFrom: { lte: now },
        OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
      },
      select: { id: true },
    }),
  ]);

  if (!organization || organization.status !== "ACTIVE" || !organization.canRequestBookings) {
    throw new BookingValidationError("Die Organisation ist gesperrt oder fuer Buchungen nicht aktiv.");
  }

  assertOrganizationBookingAccess({
    isAdmin: permissions.isAdmin,
    hasActiveMembership: Boolean(membership),
  });

  if (!room || room.status !== "ACTIVE" || !room.building.isActive) {
    throw new BookingValidationError("Der ausgewaehlte Raum ist nicht aktiv buchbar.");
  }

  if (!usageType) {
    throw new BookingValidationError("Der ausgewaehlte Nutzungstyp ist nicht gueltig.");
  }

  const { blockedFrom, blockedUntil } = resolveBookingBlockedWindow({
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    setupBufferMinutes: room.setupBufferMinutes,
    teardownBufferMinutes: room.teardownBufferMinutes,
  });

  validateBookingAvailability({
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    blockedFrom,
    blockedUntil,
    openingTime: room.openingTime,
    closingTime: room.closingTime,
    maximumBookingMinutes: room.maximumBookingMinutes,
    singleBookingLeadDays: room.singleBookingLeadDays,
    now,
  });

  const conflicts = await checkBookingConflicts(
    {
      roomId: data.roomId,
      buildingId: room.building.id,
      blockedFrom,
      blockedUntil,
    },
    client,
  );
  const blockingConflicts = conflicts.filter((conflict) => conflict.severity === "blocking");

  if (blockingConflicts.length) {
    throw new BookingValidationError(blockingConflicts.map((conflict) => conflict.message).join(" "), conflicts);
  }

  const booking = await requestBooking(
    {
      actorUserId,
      organizationId: data.organizationId,
      roomId: data.roomId,
      usageTypeId: data.usageTypeId,
      title: data.title,
      description: data.description || null,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      blockedFrom,
      blockedUntil,
    },
    client,
  );

  return { booking, conflicts };
}

export async function createBookingRequest(
  input: unknown,
  actorUserId: string,
  options: CreateBookingRequestOptions = {},
) {
  const data = bookingRequestSchema.parse(input);
  const now = options.now ?? new Date();
  const permissions = await resolveBookingRequestPermissions(actorUserId, options.permissions);

  if (options.client) {
    return createBookingRequestWithClient(data, actorUserId, options.client, { now, permissions });
  }

  return prisma.$transaction((transaction) =>
    createBookingRequestWithClient(data, actorUserId, transaction, { now, permissions }),
  );
}
