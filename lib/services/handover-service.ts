import { Prisma, type Handover } from "@prisma/client";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { BookingValidationError } from "@/lib/services/booking-rules";
import { isAssignedCaretakerForBooking, isAssignedCaretakerUserForBooking } from "@/lib/services/no-show-service";

export const handoverEventSchema = z.object({
  bookingId: z.string().trim().min(1, "Eine Buchung ist erforderlich."),
  action: z.enum(["KEY_RECEIVED", "ROOM_ACCEPTED", "ROOM_RETURNED"]),
  notes: z
    .string()
    .trim()
    .max(2000, "Notizen duerfen maximal 2000 Zeichen lang sein.")
    .optional()
    .or(z.literal("")),
});

export type HandoverAction = z.infer<typeof handoverEventSchema>["action"];
export type HandoverStatus = "OPEN" | "KEY_RECEIVED" | "ROOM_ACCEPTED" | "ROOM_RETURNED";

type HandoverSnapshot = Pick<Handover, "keyReceivedAt" | "roomAcceptedAt" | "roomReturnedAt">;

type HandoverPermissionState = {
  canManageHandovers: boolean;
  canViewBookings: boolean;
};

type HandoverActor = {
  id: string;
  email: string;
};

type HandoverBookingScope = Parameters<typeof isAssignedCaretakerUserForBooking>[1];

const handoverActionLabels: Record<HandoverAction, string> = {
  KEY_RECEIVED: "Schluessel erhalten",
  ROOM_ACCEPTED: "Halle uebernommen",
  ROOM_RETURNED: "Halle retourniert",
};

const handoverStatusLabels: Record<HandoverStatus, string> = {
  OPEN: "Offen",
  KEY_RECEIVED: "Schluessel erhalten",
  ROOM_ACCEPTED: "Halle uebernommen",
  ROOM_RETURNED: "Halle retourniert",
};

export function getHandoverActionLabel(action: HandoverAction) {
  return handoverActionLabels[action];
}

export function getHandoverStatusLabel(status: HandoverStatus) {
  return handoverStatusLabels[status];
}

export function getHandoverStatus(handover: HandoverSnapshot | null | undefined): HandoverStatus {
  if (handover?.roomReturnedAt) {
    return "ROOM_RETURNED";
  }

  if (handover?.roomAcceptedAt) {
    return "ROOM_ACCEPTED";
  }

  if (handover?.keyReceivedAt) {
    return "KEY_RECEIVED";
  }

  return "OPEN";
}

export function assertHandoverTransition(handover: HandoverSnapshot | null | undefined, action: HandoverAction) {
  const currentStatus = getHandoverStatus(handover);
  const allowed: Record<HandoverStatus, HandoverAction[]> = {
    OPEN: ["KEY_RECEIVED"],
    KEY_RECEIVED: ["ROOM_ACCEPTED"],
    ROOM_ACCEPTED: ["ROOM_RETURNED"],
    ROOM_RETURNED: [],
  };

  if (!allowed[currentStatus].includes(action)) {
    throw new BookingValidationError("Dieser Hallenuebergabe-Schritt ist in der aktuellen Reihenfolge nicht erlaubt.");
  }
}

function caretakerAssignmentFilter(actor: HandoverActor): Prisma.RoomWhereInput {
  return {
    OR: [
      { caretakers: { some: { caretaker: { userId: actor.id } } } },
      { building: { caretakers: { some: { caretaker: { userId: actor.id } } } } },
      { caretakers: { some: { caretaker: { email: actor.email } } } },
      { building: { caretakers: { some: { caretaker: { email: actor.email } } } } },
    ],
  };
}

function assertHandoverPermission({
  permissions,
  actorUserId,
  actorEmail,
  booking,
}: {
  permissions: HandoverPermissionState;
  actorUserId: string;
  actorEmail: string;
  booking: HandoverBookingScope;
}) {
  if (!permissions.canManageHandovers) {
    throw new BookingValidationError("Fuer Hallenuebergaben fehlt das Recht MANAGE_HANDOVERS.");
  }

  if (permissions.canViewBookings) {
    return;
  }

  if (!isAssignedCaretakerUserForBooking(actorUserId, booking) && !isAssignedCaretakerForBooking(actorEmail, booking)) {
    throw new BookingValidationError("Hallenuebergaben duerfen nur fuer zugeordnete Raeume oder Gebaeude erfasst werden.");
  }
}

async function resolveHandoverActor(actorUserId: string): Promise<HandoverActor> {
  const user = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new BookingValidationError("Der Benutzer wurde nicht gefunden.");
  }

  return user;
}

async function resolveHandoverPermissions(actorUserId: string): Promise<HandoverPermissionState> {
  const [canManageHandovers, canViewBookings] = await Promise.all([
    hasPermission(actorUserId, "MANAGE_HANDOVERS"),
    hasPermission(actorUserId, "VIEW_BOOKINGS"),
  ]);

  return { canManageHandovers, canViewBookings };
}

export async function getAdminHandoverData(actorUserId: string) {
  const actor = await resolveHandoverActor(actorUserId);
  const permissions = await resolveHandoverPermissions(actorUserId);

  if (!permissions.canManageHandovers) {
    throw new BookingValidationError("Fuer Hallenuebergaben fehlt das Recht MANAGE_HANDOVERS.");
  }

  const bookings = await prisma.booking.findMany({
    where: {
      status: "APPROVED",
      ...(permissions.canViewBookings ? {} : { room: caretakerAssignmentFilter(actor) }),
    },
    include: {
      organization: true,
      room: { include: { building: true } },
      usageType: true,
      handover: true,
    },
    orderBy: [{ startsAt: "asc" }, { title: "asc" }],
    take: 100,
  });

  return { bookings, canViewAll: permissions.canViewBookings };
}

type HandoverTimestampData = {
  keyReceivedAt?: Date;
  roomAcceptedAt?: Date;
  roomReturnedAt?: Date;
  notes?: string;
};

type HandoverMutationClient = {
  handover: {
    create(args: Prisma.HandoverCreateArgs): Promise<Handover>;
    updateMany(args: Prisma.HandoverUpdateManyArgs): Promise<Prisma.BatchPayload>;
    findUnique(args: Prisma.HandoverFindUniqueArgs): Promise<Handover | null>;
  };
};

function handoverTimestampData(action: HandoverAction, now: Date, notes: string | undefined): HandoverTimestampData {
  return {
    ...(action === "KEY_RECEIVED" ? { keyReceivedAt: now } : {}),
    ...(action === "ROOM_ACCEPTED" ? { roomAcceptedAt: now } : {}),
    ...(action === "ROOM_RETURNED" ? { roomReturnedAt: now } : {}),
    ...(notes ? { notes } : {}),
  };
}

export async function applyHandoverTransition(
  client: HandoverMutationClient,
  bookingId: string,
  action: HandoverAction,
  now: Date,
  notes: string | undefined,
) {
  const data = handoverTimestampData(action, now, notes);

  if (action === "KEY_RECEIVED") {
    try {
      return await client.handover.create({
        data: {
          bookingId,
          ...data,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BookingValidationError("Dieser Hallenuebergabe-Schritt wurde bereits erfasst.");
      }

      throw error;
    }
  }

  const expectedState: Prisma.HandoverWhereInput =
    action === "ROOM_ACCEPTED"
      ? {
          bookingId,
          keyReceivedAt: { not: null },
          roomAcceptedAt: null,
          roomReturnedAt: null,
        }
      : {
          bookingId,
          keyReceivedAt: { not: null },
          roomAcceptedAt: { not: null },
          roomReturnedAt: null,
        };

  const result = await client.handover.updateMany({
    where: expectedState,
    data,
  });

  if (result.count !== 1) {
    throw new BookingValidationError("Dieser Hallenuebergabe-Schritt ist nicht mehr im erwarteten Zustand.");
  }

  const handover = await client.handover.findUnique({ where: { bookingId } });
  if (!handover) {
    throw new BookingValidationError("Die Hallenuebergabe wurde nicht gefunden.");
  }

  return handover;
}

export async function recordHandoverEvent(input: unknown, actorUserId: string, now = new Date()) {
  const data = handoverEventSchema.parse(input);
  const [actor, permissions] = await Promise.all([
    resolveHandoverActor(actorUserId),
    resolveHandoverPermissions(actorUserId),
  ]);

  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: {
      room: {
        include: {
          caretakers: { include: { caretaker: true } },
          building: { include: { caretakers: { include: { caretaker: true } } } },
        },
      },
    },
  });

  if (!booking) {
    throw new BookingValidationError("Die Buchung wurde nicht gefunden.");
  }

  assertHandoverPermission({ permissions, actorUserId: actor.id, actorEmail: actor.email, booking });

  if (booking.status !== "APPROVED") {
    throw new BookingValidationError("Hallenuebergaben koennen nur fuer genehmigte Buchungen erfasst werden.");
  }

  const notes = data.notes?.trim() || undefined;

  return prisma.$transaction(async (transaction) => {
    const handover = await applyHandoverTransition(transaction, booking.id, data.action, now, notes);

    await transaction.auditEntry.create({
      data: {
        actorUserId,
        entityType: "Handover",
        entityId: handover.id,
        action: data.action,
        payload: {
          bookingId: booking.id,
          actionLabel: getHandoverActionLabel(data.action),
          notes,
        },
      },
    });

    return handover;
  });
}
