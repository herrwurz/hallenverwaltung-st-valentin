import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  adminWaitlistFilterStatuses,
  type AdminWaitlistFilterKey,
  type AdminWaitlistFilterStatus,
} from "@/lib/waitlist-status";
import { checkBookingConflicts, lockWaitlistContext } from "@/lib/services/booking-conflict-service";
import { createBookingRequest } from "@/lib/services/booking-request-service";
import {
  assertBookingRequestPermission,
  assertBookingViewPermission,
  assertOrganizationBookingAccess,
  BookingValidationError,
  validateBookingAvailability,
} from "@/lib/services/booking-rules";

const waitlistRequestSchema = z.object({
  organizationId: z.string().trim().min(1, "Eine Organisation ist erforderlich."),
  roomId: z.string().trim().min(1, "Ein Raum ist erforderlich."),
  usageTypeId: z.string().trim().min(1, "Ein Nutzungstyp ist erforderlich."),
  title: z.string().trim().min(2, "Ein Titel ist erforderlich.").max(160),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

const defaultAdminStatuses: AdminWaitlistFilterStatus[] = ["ACTIVE", "OFFERED"];
const waitlistOfferWindowHours = 48;

type WaitlistRequestInput = z.infer<typeof waitlistRequestSchema>;

type WaitlistPermissionOverrides = {
  hasRequestBookingPermission?: boolean;
  isAdmin?: boolean;
  canViewAdmin?: boolean;
};

function getOfferExpiry(now: Date) {
  return new Date(now.getTime() + waitlistOfferWindowHours * 60 * 60 * 1000);
}

function resolveAdminWaitlistFilter(filter: AdminWaitlistFilterKey | undefined) {
  if (filter === "ALL") {
    return [...adminWaitlistFilterStatuses];
  }

  if (filter && adminWaitlistFilterStatuses.includes(filter as AdminWaitlistFilterStatus)) {
    return [filter as AdminWaitlistFilterStatus];
  }

  return [...defaultAdminStatuses];
}

async function resolveWaitlistPermissions(
  actorUserId: string,
  overrides: WaitlistPermissionOverrides = {},
  options: {
    includeAdminView?: boolean;
  } = {},
) {
  const [hasRequestBookingPermission, isAdmin] = await Promise.all([
    typeof overrides.hasRequestBookingPermission === "boolean"
      ? overrides.hasRequestBookingPermission
      : hasPermission(actorUserId, "REQUEST_BOOKING"),
    typeof overrides.isAdmin === "boolean" ? overrides.isAdmin : hasPermission(actorUserId, "APPROVE_BOOKING"),
  ]);
  const canViewAdmin = options.includeAdminView
    ? typeof overrides.canViewAdmin === "boolean"
      ? overrides.canViewAdmin
      : await hasPermission(actorUserId, "VIEW_BOOKINGS")
    : false;

  return {
    hasRequestBookingPermission,
    isAdmin,
    canViewAdmin,
  };
}

async function assertWaitlistActorAccess(
  client: Prisma.TransactionClient,
  {
    actorUserId,
    organizationId,
    now,
    isAdmin,
  }: {
    actorUserId: string;
    organizationId: string;
    now: Date;
    isAdmin: boolean;
  },
) {
  const [organization, membership] = await Promise.all([
    client.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, status: true, canRequestBookings: true },
    }),
    client.organizationMember.findFirst({
      where: {
        organizationId,
        userId: actorUserId,
        activeFrom: { lte: now },
        OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
      },
      select: { id: true },
    }),
  ]);

  if (!organization || organization.status !== "ACTIVE" || !organization.canRequestBookings) {
    throw new BookingValidationError("Die Organisation ist gesperrt oder fuer Wartelistenplaetze nicht aktiv.");
  }

  assertOrganizationBookingAccess({ isAdmin, hasActiveMembership: Boolean(membership) });

  return organization;
}

async function validateWaitlistSlot(
  client: Prisma.TransactionClient,
  data: WaitlistRequestInput,
  now: Date,
) {
  const [room, usageType] = await Promise.all([
    client.room.findUnique({
      where: { id: data.roomId },
      select: {
        id: true,
        status: true,
        openingTime: true,
        closingTime: true,
        maximumBookingMinutes: true,
        singleBookingLeadDays: true,
        building: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    }),
    client.usageType.findUnique({
      where: { id: data.usageTypeId },
      select: { id: true },
    }),
  ]);

  if (!room || room.status !== "ACTIVE" || !room.building.isActive) {
    throw new BookingValidationError("Der ausgewaehlte Raum ist nicht aktiv buchbar.");
  }

  if (!usageType) {
    throw new BookingValidationError("Der ausgewaehlte Nutzungstyp ist nicht gueltig.");
  }

  validateBookingAvailability({
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    blockedFrom: data.startsAt,
    blockedUntil: data.endsAt,
    openingTime: room.openingTime,
    closingTime: room.closingTime,
    maximumBookingMinutes: room.maximumBookingMinutes,
    singleBookingLeadDays: room.singleBookingLeadDays,
    now,
  });

  return room;
}

async function prepareWaitlistNotification(
  client: Prisma.TransactionClient,
  {
    recipientUserId,
    recipientEmail,
  }: {
    recipientUserId: string | null;
    recipientEmail: string | null;
  },
) {
  if (!recipientUserId || !recipientEmail) {
    return;
  }

  await client.notification.create({
    data: {
      recipientUserId,
      recipient: recipientEmail,
      eventCode: "WAITLIST_OFFER_CREATED",
      status: "PENDING",
    },
  });
}

async function activateNextWaitlistEntryForSlotWithClient(
  client: Prisma.TransactionClient,
  {
    roomId,
    blockedFrom,
    blockedUntil,
    now,
  }: {
    roomId: string;
    blockedFrom: Date;
    blockedUntil: Date;
    now: Date;
  },
) {
  const roomIds = await lockWaitlistContext(roomId, client);
  const activeOffer = await client.waitlistEntry.findFirst({
    where: {
      status: "OFFERED",
      offerExpiresAt: { gt: now },
      roomId: { in: roomIds },
      startsAt: { lt: blockedUntil },
      endsAt: { gt: blockedFrom },
    },
    select: { id: true },
  });

  if (activeOffer) {
    return null;
  }

  const candidates = await client.waitlistEntry.findMany({
    where: {
      status: "ACTIVE",
      roomId: { in: roomIds },
      startsAt: { lt: blockedUntil },
      endsAt: { gt: blockedFrom },
      organization: {
        status: "ACTIVE",
        canRequestBookings: true,
      },
      room: {
        status: "ACTIVE",
        building: { isActive: true },
      },
    },
    include: {
      organization: true,
      room: {
        include: {
          building: true,
        },
      },
      usageType: true,
      requestedBy: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: [{ placedAt: "asc" }, { startsAt: "asc" }],
  });

  for (const candidate of candidates) {
    const bookingConflicts = await checkBookingConflicts(
      {
        roomId: candidate.roomId,
        buildingId: candidate.room.building.id,
        blockedFrom: candidate.startsAt,
        blockedUntil: candidate.endsAt,
      },
      client,
    );
    const blockingConflicts = bookingConflicts.filter((conflict) => conflict.severity === "blocking");
    if (blockingConflicts.length > 0) {
      continue;
    }

    const offerExpiresAt = getOfferExpiry(now);
    const updateResult = await client.waitlistEntry.updateMany({
      where: {
        id: candidate.id,
        status: "ACTIVE",
      },
      data: {
        status: "OFFERED",
        offeredAt: now,
        offerExpiresAt,
      },
    });

    if (updateResult.count === 0) {
      continue;
    }

    await prepareWaitlistNotification(client, {
      recipientUserId: candidate.requestedBy?.id ?? null,
      recipientEmail: candidate.requestedBy?.email ?? null,
    });

    return client.waitlistEntry.findUnique({
      where: { id: candidate.id },
      include: {
        organization: true,
        room: { include: { building: true } },
        usageType: true,
        requestedBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });
  }

  return null;
}

export async function createWaitlistEntry(
  input: unknown,
  actorUserId: string,
  overrides: WaitlistPermissionOverrides = {},
) {
  const data = waitlistRequestSchema.parse(input);
  const now = new Date();
  const permissions = await resolveWaitlistPermissions(actorUserId, overrides);
  assertBookingRequestPermission(permissions.hasRequestBookingPermission);

  return prisma.$transaction(async (transaction) => {
    await assertWaitlistActorAccess(transaction, {
      actorUserId,
      organizationId: data.organizationId,
      now,
      isAdmin: permissions.isAdmin,
    });
    await validateWaitlistSlot(transaction, data, now);

    return transaction.waitlistEntry.create({
      data: {
        organizationId: data.organizationId,
        roomId: data.roomId,
        usageTypeId: data.usageTypeId,
        requestedByUserId: actorUserId,
        title: data.title,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        status: "ACTIVE",
      },
      include: {
        organization: true,
        room: { include: { building: true } },
        usageType: true,
      },
    });
  });
}

export async function getWaitlistForOrganization(actorUserId: string) {
  const now = new Date();

  return prisma.waitlistEntry.findMany({
    where: {
      organization: {
        members: {
          some: {
            userId: actorUserId,
            activeFrom: { lte: now },
            OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
          },
        },
      },
    },
    include: {
      organization: true,
      room: { include: { building: true } },
      usageType: true,
      requestedBy: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
    orderBy: [{ placedAt: "desc" }, { startsAt: "asc" }],
  });
}

export async function getWaitlistForAdmin(
  actorUserId: string,
  filter: AdminWaitlistFilterKey | undefined,
  overrides: WaitlistPermissionOverrides = {},
) {
  const permissions = await resolveWaitlistPermissions(actorUserId, overrides, { includeAdminView: true });
  assertBookingViewPermission(permissions.canViewAdmin);
  const statuses = resolveAdminWaitlistFilter(filter);

  return prisma.waitlistEntry.findMany({
    where: {
      status: { in: statuses },
    },
    include: {
      organization: true,
      room: { include: { building: true } },
      usageType: true,
      requestedBy: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { placedAt: "asc" }, { startsAt: "asc" }],
  });
}

export async function activateNextWaitlistEntryForSlot(
  {
    roomId,
    blockedFrom,
    blockedUntil,
  }: {
    roomId: string;
    blockedFrom: Date;
    blockedUntil: Date;
  },
  options: {
    client?: Prisma.TransactionClient;
    now?: Date;
  } = {},
) {
  const now = options.now ?? new Date();

  if (options.client) {
    return activateNextWaitlistEntryForSlotWithClient(options.client, {
      roomId,
      blockedFrom,
      blockedUntil,
      now,
    });
  }

  return prisma.$transaction((transaction) =>
    activateNextWaitlistEntryForSlotWithClient(transaction, {
      roomId,
      blockedFrom,
      blockedUntil,
      now,
    }),
  );
}

export async function acceptWaitlistOffer(
  waitlistEntryId: string,
  actorUserId: string,
  overrides: WaitlistPermissionOverrides = {},
) {
  const now = new Date();
  const permissions = await resolveWaitlistPermissions(actorUserId, overrides);
  assertBookingRequestPermission(permissions.hasRequestBookingPermission);

  return prisma.$transaction(async (transaction) => {
    const entry = await transaction.waitlistEntry.findUnique({
      where: { id: waitlistEntryId },
      include: {
        room: {
          include: {
            building: true,
          },
        },
      },
    });

    if (!entry) {
      throw new BookingValidationError("Der Wartelistenplatz wurde nicht gefunden.");
    }

    await assertWaitlistActorAccess(transaction, {
      actorUserId,
      organizationId: entry.organizationId,
      now,
      isAdmin: permissions.isAdmin,
    });

    if (entry.status !== "OFFERED" || !entry.offerExpiresAt || entry.offerExpiresAt <= now) {
      throw new BookingValidationError("Das Wartelistenangebot ist nicht mehr gueltig.");
    }

    const updated = await transaction.waitlistEntry.updateMany({
      where: {
        id: waitlistEntryId,
        status: "OFFERED",
        offerExpiresAt: { gt: now },
      },
      data: {
        status: "ACCEPTED",
      },
    });

    if (updated.count === 0) {
      throw new BookingValidationError("Das Wartelistenangebot wurde zwischenzeitlich geaendert.");
    }

    const bookingResult = await createBookingRequest(
      {
        organizationId: entry.organizationId,
        roomId: entry.roomId,
        usageTypeId: entry.usageTypeId,
        title: entry.title,
        startsAt: entry.startsAt,
        endsAt: entry.endsAt,
      },
      actorUserId,
      {
        client: transaction,
        now,
        permissions: {
          hasRequestBookingPermission: permissions.hasRequestBookingPermission,
          isAdmin: permissions.isAdmin,
        },
      },
    );

    return {
      waitlistEntry: await transaction.waitlistEntry.findUniqueOrThrow({
        where: { id: waitlistEntryId },
        include: {
          organization: true,
          room: { include: { building: true } },
          usageType: true,
        },
      }),
      booking: bookingResult.booking,
    };
  });
}

export async function declineWaitlistOffer(
  waitlistEntryId: string,
  actorUserId: string,
  overrides: WaitlistPermissionOverrides = {},
) {
  const now = new Date();
  const permissions = await resolveWaitlistPermissions(actorUserId, overrides);
  assertBookingRequestPermission(permissions.hasRequestBookingPermission);

  return prisma.$transaction(async (transaction) => {
    const entry = await transaction.waitlistEntry.findUnique({
      where: { id: waitlistEntryId },
      select: {
        id: true,
        organizationId: true,
        roomId: true,
        startsAt: true,
        endsAt: true,
        status: true,
        offerExpiresAt: true,
      },
    });

    if (!entry) {
      throw new BookingValidationError("Der Wartelistenplatz wurde nicht gefunden.");
    }

    await assertWaitlistActorAccess(transaction, {
      actorUserId,
      organizationId: entry.organizationId,
      now,
      isAdmin: permissions.isAdmin,
    });

    if (entry.status !== "OFFERED" || !entry.offerExpiresAt || entry.offerExpiresAt <= now) {
      throw new BookingValidationError("Das Wartelistenangebot ist nicht mehr gueltig.");
    }

    const updated = await transaction.waitlistEntry.updateMany({
      where: {
        id: waitlistEntryId,
        status: "OFFERED",
        offerExpiresAt: { gt: now },
      },
      data: {
        status: "DECLINED",
      },
    });

    if (updated.count === 0) {
      throw new BookingValidationError("Das Wartelistenangebot wurde zwischenzeitlich geaendert.");
    }

    await activateNextWaitlistEntryForSlotWithClient(transaction, {
      roomId: entry.roomId,
      blockedFrom: entry.startsAt,
      blockedUntil: entry.endsAt,
      now,
    });

    return transaction.waitlistEntry.findUniqueOrThrow({
      where: { id: waitlistEntryId },
      include: {
        organization: true,
        room: { include: { building: true } },
        usageType: true,
      },
    });
  });
}

export async function expireWaitlistOffers(now = new Date()) {
  const expiredOffers = await prisma.waitlistEntry.findMany({
    where: {
      status: "OFFERED",
      offerExpiresAt: { lte: now },
    },
    select: {
      id: true,
      roomId: true,
      startsAt: true,
      endsAt: true,
    },
    orderBy: { offerExpiresAt: "asc" },
  });

  const expiredIds: string[] = [];

  for (const offer of expiredOffers) {
    const expired = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.waitlistEntry.updateMany({
        where: {
          id: offer.id,
          status: "OFFERED",
          offerExpiresAt: { lte: now },
        },
        data: {
          status: "EXPIRED",
        },
      });

      if (updated.count === 0) {
        return false;
      }

      await activateNextWaitlistEntryForSlotWithClient(transaction, {
        roomId: offer.roomId,
        blockedFrom: offer.startsAt,
        blockedUntil: offer.endsAt,
        now,
      });

      return true;
    });

    if (expired) {
      expiredIds.push(offer.id);
    }
  }

  return expiredIds;
}
