import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  adminWaitlistFilterStatuses,
  type AdminWaitlistFilterKey,
  type AdminWaitlistFilterStatus,
} from "@/lib/waitlist-status";
import { checkBookingConflicts, lockWaitlistContext } from "@/lib/services/booking-conflict-service";
import { createBookingRequest, resolveBookingBlockedWindow } from "@/lib/services/booking-request-service";
import {
  assertBookingRequestPermission,
  assertBookingViewPermission,
  assertOrganizationBookingAccess,
  BookingValidationError,
  validateBookingAvailability,
} from "@/lib/services/booking-rules";
import { intervalsOverlap } from "@/lib/services/booking-conflicts";

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

type WaitlistRootClient = Pick<PrismaClient, "$transaction" | "waitlistEntry">;

type WaitlistRoomSnapshot = {
  id: string;
  status: "ACTIVE" | "RESTRICTED" | "OUT_OF_SERVICE";
  openingTime: string;
  closingTime: string;
  maximumBookingMinutes: number | null;
  singleBookingLeadDays: number;
  setupBufferMinutes: number;
  teardownBufferMinutes: number;
  building: {
    id: string;
    isActive: boolean;
    name?: string;
  };
};

type WaitlistOfferCandidate = {
  id: string;
  organizationId: string;
  roomId: string;
  usageTypeId: string;
  requestedByUserId: string | null;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: "ACTIVE" | "OFFERED" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "CANCELLED";
  placedAt: Date;
  offeredAt: Date | null;
  offerExpiresAt: Date | null;
  organization: {
    id: string;
    name?: string;
    status: "ACTIVE" | "BLOCKED" | "INACTIVE";
    canRequestBookings: boolean;
  };
  room: WaitlistRoomSnapshot;
  usageType: {
    id: string;
    name?: string;
  };
  requestedBy: {
    id: string;
    displayName?: string | null;
    email: string | null;
  } | null;
};

function getOfferExpiry(now: Date) {
  return new Date(now.getTime() + waitlistOfferWindowHours * 60 * 60 * 1000);
}

function getWaitlistBlockedWindow(entry: Pick<WaitlistOfferCandidate, "startsAt" | "endsAt" | "room">) {
  return resolveBookingBlockedWindow({
    startsAt: entry.startsAt,
    endsAt: entry.endsAt,
    setupBufferMinutes: entry.room.setupBufferMinutes,
    teardownBufferMinutes: entry.room.teardownBufferMinutes,
  });
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
        setupBufferMinutes: true,
        teardownBufferMinutes: true,
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

  return room;
}

async function prepareWaitlistNotification(
  client: Prisma.TransactionClient,
  {
    waitlistEntryId,
    recipientUserId,
    recipientEmail,
    roomId,
    startsAt,
    endsAt,
    offerExpiresAt,
  }: {
    waitlistEntryId: string;
    recipientUserId: string | null;
    recipientEmail: string | null;
    roomId: string;
    startsAt: Date;
    endsAt: Date;
    offerExpiresAt: Date;
  },
) {
  if (!recipientUserId || !recipientEmail) {
    return;
  }

  await client.notification.create({
    data: {
      waitlistEntryId,
      recipientUserId,
      recipient: recipientEmail,
      eventCode: "WAITLIST_OFFER_CREATED",
      status: "PENDING",
      payload: {
        waitlistEntryId,
        offerExpiresAt: offerExpiresAt.toISOString(),
        roomId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      },
    },
  });
}

function overlapsFreedSlot(
  entry: WaitlistOfferCandidate,
  blockedFrom: Date,
  blockedUntil: Date,
) {
  const candidateWindow = getWaitlistBlockedWindow(entry);
  return intervalsOverlap(blockedFrom, blockedUntil, candidateWindow.blockedFrom, candidateWindow.blockedUntil);
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
  const offeredEntries = (await client.waitlistEntry.findMany({
    where: {
      status: "OFFERED",
      offerExpiresAt: { gt: now },
      roomId: { in: roomIds },
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
          displayName: true,
          email: true,
        },
      },
    },
    orderBy: [{ placedAt: "asc" }, { startsAt: "asc" }],
  })) as WaitlistOfferCandidate[];
  const activeOffer = offeredEntries.find((entry) => overlapsFreedSlot(entry, blockedFrom, blockedUntil));

  if (activeOffer) {
    return activeOffer;
  }

  const candidates = (await client.waitlistEntry.findMany({
    where: {
      status: "ACTIVE",
      roomId: { in: roomIds },
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
  })) as WaitlistOfferCandidate[];

  for (const candidate of candidates) {
    if (!overlapsFreedSlot(candidate, blockedFrom, blockedUntil)) {
      continue;
    }

    const candidateWindow = getWaitlistBlockedWindow(candidate);
    const bookingConflicts = await checkBookingConflicts(
      {
        roomId: candidate.roomId,
        buildingId: candidate.room.building.id,
        blockedFrom: candidateWindow.blockedFrom,
        blockedUntil: candidateWindow.blockedUntil,
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
      waitlistEntryId: candidate.id,
      recipientUserId: candidate.requestedBy?.id ?? null,
      recipientEmail: candidate.requestedBy?.email ?? null,
      roomId: candidate.roomId,
      startsAt: candidate.startsAt,
      endsAt: candidate.endsAt,
      offerExpiresAt,
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
  rootClient: WaitlistRootClient = prisma,
) {
  const data = waitlistRequestSchema.parse(input);
  const now = new Date();
  const permissions = await resolveWaitlistPermissions(actorUserId, overrides);
  assertBookingRequestPermission(permissions.hasRequestBookingPermission);

  return rootClient.$transaction(async (transaction) => {
    await assertWaitlistActorAccess(transaction, {
      actorUserId,
      organizationId: data.organizationId,
      now,
      isAdmin: permissions.isAdmin,
    });
    await validateWaitlistSlot(transaction, data, now);

    try {
      return await transaction.waitlistEntry.create({
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BookingValidationError(
          "Fuer diese Organisation existiert bereits ein aktiver Wartelistenplatz fuer denselben Slot.",
        );
      }

      throw error;
    }
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
    rootClient?: WaitlistRootClient;
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

  return (options.rootClient ?? prisma).$transaction((transaction) =>
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
  rootClient: WaitlistRootClient = prisma,
) {
  const now = new Date();
  const permissions = await resolveWaitlistPermissions(actorUserId, overrides);
  assertBookingRequestPermission(permissions.hasRequestBookingPermission);

  return rootClient.$transaction(async (transaction) => {
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

    await lockWaitlistContext(entry.roomId, transaction);

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
  rootClient: WaitlistRootClient = prisma,
) {
  const now = new Date();
  const permissions = await resolveWaitlistPermissions(actorUserId, overrides);
  assertBookingRequestPermission(permissions.hasRequestBookingPermission);

  return rootClient.$transaction(async (transaction) => {
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

    await lockWaitlistContext(entry.roomId, transaction);

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

export async function expireWaitlistOffers(
  now = new Date(),
  rootClient: WaitlistRootClient = prisma,
) {
  const expiredOffers = await rootClient.waitlistEntry.findMany({
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
    const expired = await rootClient.$transaction(async (transaction) => {
      await lockWaitlistContext(offer.roomId, transaction);

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
