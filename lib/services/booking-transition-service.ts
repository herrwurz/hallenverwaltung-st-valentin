import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  checkBookingConflicts,
  lockBookingApprovalContext,
  type BookingApprovalLockClient,
  type BookingConflictClient,
} from "@/lib/services/booking-conflict-service";
import { BookingValidationError } from "@/lib/services/booking-rules";

const transitionBookingSelect = {
  id: true,
  organizationId: true,
  roomId: true,
  requestedByUserId: true,
  processedByUserId: true,
  status: true,
  title: true,
  description: true,
  startsAt: true,
  endsAt: true,
  blockedFrom: true,
  blockedUntil: true,
  requestedAt: true,
  processedAt: true,
} satisfies Prisma.BookingSelect;

type TransitionBookingRecord = Prisma.BookingGetPayload<{ select: typeof transitionBookingSelect }>;

type TransitionClient = {
  booking: {
    create(args: {
      data: Prisma.BookingUncheckedCreateInput;
      select: typeof transitionBookingSelect;
    }): Promise<TransitionBookingRecord>;
    findFirst(args: {
      where: Prisma.BookingWhereInput;
      select: typeof transitionBookingSelect;
    }): Promise<TransitionBookingRecord | null>;
    findUnique(args: {
      where: Prisma.BookingWhereUniqueInput;
      select: typeof transitionBookingSelect;
    }): Promise<TransitionBookingRecord | null>;
    updateMany(args: {
      where: Prisma.BookingWhereInput;
      data: Prisma.BookingUncheckedUpdateManyInput;
    }): Promise<{ count: number }>;
  };
  bookingStatusHistory: {
    create(args: {
      data: Prisma.BookingStatusHistoryUncheckedCreateInput;
    }): Promise<unknown>;
  };
};

type ApprovalTransitionClient = TransitionClient & BookingConflictClient & BookingApprovalLockClient;

type CreateBookingTransitionInput = {
  actorUserId: string;
  organizationId: string;
  roomId: string;
  usageTypeId: string;
  seriesId?: string | null;
  kind?: "SINGLE" | "SERIES_OCCURRENCE";
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  blockedFrom: Date;
  blockedUntil: Date;
};

type UpdateBookingTransitionInput = {
  bookingId: string;
  actorUserId: string;
  expectedStatuses: BookingStatus[];
  nextStatus: BookingStatus;
  reason: string;
  updateData?: Prisma.BookingUncheckedUpdateManyInput;
  scope?: Prisma.BookingWhereInput;
  notFoundMessage: string;
  invalidStatusMessage: string;
  parallelChangeMessage: string;
  newStartsAt?: Date;
  newEndsAt?: Date;
};

function createHistoryEntry({
  bookingId,
  actorUserId,
  oldStatus,
  newStatus,
  reason,
  oldStartAt,
  oldEndAt,
  newStartAt,
  newEndAt,
}: {
  bookingId: string;
  actorUserId: string;
  oldStatus: BookingStatus | null;
  newStatus: BookingStatus;
  reason: string;
  oldStartAt?: Date | null;
  oldEndAt?: Date | null;
  newStartAt?: Date | null;
  newEndAt?: Date | null;
}) {
  return {
    bookingId,
    actorUserId,
    oldStatus,
    newStatus,
    reason,
    oldStartAt: oldStartAt ?? null,
    oldEndAt: oldEndAt ?? null,
    newStartAt: newStartAt ?? null,
    newEndAt: newEndAt ?? null,
  };
}

async function applyExistingBookingTransition(client: TransitionClient, input: UpdateBookingTransitionInput) {
  const scopedWhere: Prisma.BookingWhereInput = {
    id: input.bookingId,
    ...(input.scope ?? {}),
  };
  const currentBooking = await client.booking.findFirst({
    where: scopedWhere,
    select: transitionBookingSelect,
  });

  if (!currentBooking) {
    throw new BookingValidationError(input.notFoundMessage);
  }

  if (!input.expectedStatuses.includes(currentBooking.status)) {
    throw new BookingValidationError(input.invalidStatusMessage);
  }

  const updateResult = await client.booking.updateMany({
    where: {
      ...scopedWhere,
      status: currentBooking.status,
    },
    data: {
      status: input.nextStatus,
      ...(input.updateData ?? {}),
    },
  });

  if (updateResult.count !== 1) {
    throw new BookingValidationError(input.parallelChangeMessage);
  }

  await client.bookingStatusHistory.create({
    data: createHistoryEntry({
      bookingId: currentBooking.id,
      actorUserId: input.actorUserId,
      oldStatus: currentBooking.status,
      newStatus: input.nextStatus,
      reason: input.reason,
      oldStartAt: currentBooking.startsAt,
      oldEndAt: currentBooking.endsAt,
      newStartAt: input.newStartsAt ?? currentBooking.startsAt,
      newEndAt: input.newEndsAt ?? currentBooking.endsAt,
    }),
  });

  const updatedBooking = await client.booking.findUnique({
    where: { id: currentBooking.id },
    select: transitionBookingSelect,
  });

  if (!updatedBooking) {
    throw new BookingValidationError("Die Buchung konnte nach der Statusänderung nicht geladen werden.");
  }

  return updatedBooking;
}

export async function requestBooking(input: CreateBookingTransitionInput, client: TransitionClient = prisma) {
  const booking = await client.booking.create({
    data: {
      organizationId: input.organizationId,
      roomId: input.roomId,
      usageTypeId: input.usageTypeId,
      requestedByUserId: input.actorUserId,
      seriesId: input.seriesId ?? null,
      kind: input.kind ?? "SINGLE",
      status: "REQUESTED",
      title: input.title,
      description: input.description,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      blockedFrom: input.blockedFrom,
      blockedUntil: input.blockedUntil,
    },
    select: transitionBookingSelect,
  });

  await client.bookingStatusHistory.create({
    data: createHistoryEntry({
      bookingId: booking.id,
      actorUserId: input.actorUserId,
      oldStatus: null,
      newStatus: "REQUESTED",
      reason: "Buchungsantrag erstellt.",
      newStartAt: input.startsAt,
      newEndAt: input.endsAt,
    }),
  });

  return booking;
}

export async function cancelBooking(
  input: {
    bookingId: string;
    actorUserId: string;
    scope?: Prisma.BookingWhereInput;
  },
  client?: TransitionClient,
) {
  const execute = async (transaction: TransitionClient) =>
    applyExistingBookingTransition(transaction, {
      bookingId: input.bookingId,
      actorUserId: input.actorUserId,
      expectedStatuses: ["REQUESTED"],
      nextStatus: "CANCELLED",
      reason: "Vom Antragsteller storniert.",
      updateData: { cancellationNote: "Vom Antragsteller storniert." },
      scope: input.scope,
      notFoundMessage: "Der Buchungsantrag wurde nicht gefunden.",
      invalidStatusMessage: "Nur beantragte Buchungen können storniert werden.",
      parallelChangeMessage: "Die Buchung wurde zwischenzeitlich geändert. Bitte neu laden.",
    });

  return client ? execute(client) : prisma.$transaction((transaction) => execute(transaction));
}

export async function markBookingInReview(
  input: {
    bookingId: string;
    actorUserId: string;
  },
  client?: TransitionClient,
) {
  const execute = async (transaction: TransitionClient) =>
    applyExistingBookingTransition(transaction, {
      bookingId: input.bookingId,
      actorUserId: input.actorUserId,
      expectedStatuses: ["REQUESTED"],
      nextStatus: "IN_REVIEW",
      reason: "Zur Prüfung übernommen.",
      updateData: {
        processedByUserId: input.actorUserId,
        processedAt: new Date(),
      },
      notFoundMessage: "Die Buchung wurde nicht gefunden.",
      invalidStatusMessage: "Nur beantragte Buchungen können in Prüfung gesetzt werden.",
      parallelChangeMessage: "Die Buchung wurde zwischenzeitlich geändert. Bitte neu laden.",
    });

  return client ? execute(client) : prisma.$transaction((transaction) => execute(transaction));
}

export async function moveBooking(
  input: {
    bookingId: string;
    actorUserId: string;
    startsAt: Date;
    endsAt: Date;
    blockedFrom: Date;
    blockedUntil: Date;
    reason?: string;
  },
  client?: TransitionClient,
) {
  const execute = async (transaction: TransitionClient) =>
    applyExistingBookingTransition(transaction, {
      bookingId: input.bookingId,
      actorUserId: input.actorUserId,
      expectedStatuses: ["REQUESTED", "IN_REVIEW", "APPROVED"],
      nextStatus: "MOVED",
      reason: input.reason ?? "Buchung verschoben.",
      updateData: {
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        blockedFrom: input.blockedFrom,
        blockedUntil: input.blockedUntil,
      },
      notFoundMessage: "Die Buchung wurde nicht gefunden.",
      invalidStatusMessage: "Diese Buchung kann nicht verschoben werden.",
      parallelChangeMessage: "Die Buchung wurde zwischenzeitlich geändert. Bitte neu laden.",
      newStartsAt: input.startsAt,
      newEndsAt: input.endsAt,
    });

  return client ? execute(client) : prisma.$transaction((transaction) => execute(transaction));
}

export async function approveBooking(
  input: {
    bookingId: string;
    actorUserId: string;
    decisionNote?: string;
    roomId: string;
    buildingId: string;
    blockedFrom: Date;
    blockedUntil: Date;
    allowClosureOverride?: boolean;
  },
  client?: ApprovalTransitionClient,
) {
  const execute = async (transaction: ApprovalTransitionClient) => {
    await lockBookingApprovalContext(input.roomId, transaction);

    const conflicts = await checkBookingConflicts(
      {
        roomId: input.roomId,
        buildingId: input.buildingId,
        blockedFrom: input.blockedFrom,
        blockedUntil: input.blockedUntil,
        excludeBookingId: input.bookingId,
      },
      transaction,
    );
    const blockingConflicts = conflicts.filter((conflict) => conflict.severity === "blocking");
    const nonClosureBlockingConflicts = blockingConflicts.filter((conflict) => conflict.type !== "CLOSURE");
    const closureBlockingConflicts = blockingConflicts.filter((conflict) => conflict.type === "CLOSURE");

    if (nonClosureBlockingConflicts.length) {
      throw new BookingValidationError(blockingConflicts.map((conflict) => conflict.message).join(" "), conflicts);
    }

    if (closureBlockingConflicts.length && !input.allowClosureOverride) {
      throw new BookingValidationError(closureBlockingConflicts.map((conflict) => conflict.message).join(" "), conflicts);
    }

    if (closureBlockingConflicts.length && !input.decisionNote?.trim()) {
      throw new BookingValidationError("Bei Genehmigung trotz Sperre ist ein Kommentar erforderlich.", conflicts);
    }

    return applyExistingBookingTransition(transaction, {
      bookingId: input.bookingId,
      actorUserId: input.actorUserId,
      expectedStatuses: ["REQUESTED", "IN_REVIEW"],
      nextStatus: "APPROVED",
      reason: input.decisionNote?.trim() || "Buchung genehmigt.",
      updateData: {
        processedByUserId: input.actorUserId,
        processedAt: new Date(),
        decisionNote: input.decisionNote?.trim() || null,
      },
      notFoundMessage: "Die Buchung wurde nicht gefunden.",
      invalidStatusMessage: "Nur beantragte oder in Prüfung befindliche Buchungen können genehmigt werden.",
      parallelChangeMessage: "Die Buchung wurde zwischenzeitlich geändert. Bitte neu laden.",
    });
  };

  return client ? execute(client) : prisma.$transaction((transaction) => execute(transaction));
}

export async function rejectBooking(
  input: {
    bookingId: string;
    actorUserId: string;
    decisionNote?: string;
  },
  client?: TransitionClient,
) {
  const execute = async (transaction: TransitionClient) =>
    applyExistingBookingTransition(transaction, {
      bookingId: input.bookingId,
      actorUserId: input.actorUserId,
      expectedStatuses: ["REQUESTED", "IN_REVIEW"],
      nextStatus: "REJECTED",
      reason: input.decisionNote?.trim() || "Buchung abgelehnt.",
      updateData: {
        processedByUserId: input.actorUserId,
        processedAt: new Date(),
        decisionNote: input.decisionNote?.trim() || null,
      },
      notFoundMessage: "Die Buchung wurde nicht gefunden.",
      invalidStatusMessage: "Nur beantragte oder in Prüfung befindliche Buchungen können abgelehnt werden.",
      parallelChangeMessage: "Die Buchung wurde zwischenzeitlich geändert. Bitte neu laden.",
    });

  return client ? execute(client) : prisma.$transaction((transaction) => execute(transaction));
}

