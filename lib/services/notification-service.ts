import type { Prisma, PrismaClient } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getBookingStatusLabel } from "@/lib/booking-status";
import { MailDeliveryError, sendEmail, type MailPayload } from "@/lib/services/mail-service";
import { isNotificationEventEnabled } from "@/lib/services/notification-settings-service";
import { renderNotificationTemplate } from "@/lib/services/notification-template-service";
import type {
  BookingNotificationPayload,
  BookingSeriesNotificationPayload,
  BookingChangeNotificationPayload,
  ClosureNotificationPayload,
  DamageNotificationPayload,
  OrganizationNotificationPayload,
  NoShowNotificationPayload,
  NotificationEventCode,
  UserAccountNotificationPayload,
  WaitlistNotificationPayload,
} from "@/lib/services/notification-types";

type NotificationEventStatusFilter = "ALL" | "PENDING" | "SENT" | "FAILED";

type NotificationClient = Pick<
  PrismaClient,
  | "notification"
  | "booking"
  | "bookingSeries"
  | "bookingChangeRequest"
  | "closure"
  | "organization"
  | "waitlistEntry"
  | "damageReport"
  | "noShowReport"
  | "user"
  | "systemSetting"
>;

type MailSender = (payload: MailPayload) => Promise<unknown>;

type NotificationDeliveryDependencies = {
  sendMail?: MailSender;
  now?: () => Date;
};

const baseRetryDelayMinutes = 15;
const maxRetryDelayMinutes = 24 * 60;

const notificationListSelect = {
  id: true,
  bookingId: true,
  waitlistEntryId: true,
  recipientUserId: true,
  eventCode: true,
  channel: true,
  recipient: true,
  status: true,
  payload: true,
  attemptCount: true,
  maxAttempts: true,
  nextAttemptAt: true,
  lastError: true,
  createdAt: true,
  sentAt: true,
  errorMessage: true,
  booking: {
    select: {
      id: true,
      title: true,
      organization: {
        select: {
          name: true,
        },
      },
      room: {
        select: {
          name: true,
          building: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  },
  waitlistEntry: {
    select: {
      id: true,
      title: true,
      organization: {
        select: {
          name: true,
        },
      },
      room: {
        select: {
          name: true,
          building: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  },
  recipientUser: {
    select: {
      displayName: true,
      email: true,
    },
  },
} satisfies Prisma.NotificationSelect;

type NotificationListRecord = Prisma.NotificationGetPayload<{ select: typeof notificationListSelect }>;

function dedupeRecipients<T extends { email: string | null }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const email = item.email?.trim().toLowerCase();
    if (!email || seen.has(email)) {
      return false;
    }

    seen.add(email);
    return true;
  });
}

async function getAdminRecipients(client: NotificationClient) {
  const adminCandidates = await client.user.findMany({
    where: {
      isActive: true,
      OR: [
        {
          permissions: {
            some: {
              permission: { code: "APPROVE_BOOKING" },
              granted: true,
            },
          },
        },
        {
          AND: [
            {
              roles: {
                some: {
                  role: {
                    permissions: {
                      some: {
                        permission: { code: "APPROVE_BOOKING" },
                      },
                    },
                  },
                },
              },
            },
            {
              permissions: {
                none: {
                  permission: { code: "APPROVE_BOOKING" },
                  granted: false,
                },
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      displayName: true,
      email: true,
    },
  });

  return dedupeRecipients(adminCandidates);
}

async function queueNotificationRows(
  rows: Array<{
    eventCode: NotificationEventCode;
    recipientUserId?: string | null;
    recipient: string;
    bookingId?: string | null;
    waitlistEntryId?: string | null;
    payload: Prisma.InputJsonValue;
  }>,
  client: NotificationClient = prisma,
) {
  const createdIds: string[] = [];
  const enabledCache = new Map<NotificationEventCode, boolean>();

  for (const row of rows) {
    let enabled = enabledCache.get(row.eventCode);
    if (typeof enabled !== "boolean") {
      enabled = "systemSetting" in client ? await isNotificationEventEnabled(row.eventCode, client) : true;
    }
    enabledCache.set(row.eventCode, enabled);
    if (!enabled) {
      continue;
    }

    const notification = await client.notification.create({
      data: {
        bookingId: row.bookingId ?? null,
        waitlistEntryId: row.waitlistEntryId ?? null,
        recipientUserId: row.recipientUserId ?? null,
        eventCode: row.eventCode,
        recipient: row.recipient,
        payload: row.payload,
      },
      select: { id: true },
    });
    createdIds.push(notification.id);
  }

  return createdIds;
}

export async function queueBookingNotifications(
  bookingId: string,
  eventCode:
    | "BOOKING_REQUESTED"
    | "BOOKING_IN_REVIEW"
    | "BOOKING_APPROVED"
    | "BOOKING_REJECTED"
    | "BOOKING_CANCELLED",
  client: NotificationClient = prisma,
) {
  const booking = await client.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      title: true,
      status: true,
      startsAt: true,
      endsAt: true,
      decisionNote: true,
      cancellationNote: true,
      usageType: {
        select: { name: true },
      },
      requestedBy: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
      processedBy: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
      organization: {
        select: {
          name: true,
          members: {
            where: {
              activeFrom: { lte: new Date() },
              OR: [{ activeUntil: null }, { activeUntil: { gt: new Date() } }],
            },
            select: {
              user: {
                select: {
                  id: true,
                  email: true,
                  displayName: true,
                },
              },
              isPrimary: true,
            },
          },
        },
      },
      room: {
        select: {
          name: true,
          caretakers: {
            select: {
              caretaker: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
          building: {
            select: {
              name: true,
              caretakers: {
                select: {
                  caretaker: {
                    select: {
                      id: true,
                      email: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return [];
  }

  const payload: BookingNotificationPayload = {
    bookingId: booking.id,
    title: booking.title,
    organizationName: booking.organization.name,
    buildingName: booking.room.building.name,
    roomName: booking.room.name,
    usageTypeName: booking.usageType.name,
    status: getBookingStatusLabel(booking.status),
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    requestedByName: booking.requestedBy?.displayName ?? undefined,
    processedByName: booking.processedBy?.displayName ?? undefined,
  };

  const requesterRecipients = dedupeRecipients(
    [
      booking.requestedBy
        ? {
            id: booking.requestedBy.id,
            email: booking.requestedBy.email,
          }
        : null,
      ...booking.organization.members
        .filter((member) => member.isPrimary)
        .map((member) => ({
          id: member.user.id,
          email: member.user.email,
        })),
    ].filter(Boolean) as Array<{ id: string; email: string | null }>,
  );

  const caretakerRecipients = dedupeRecipients(
    [
      ...booking.room.caretakers.map(({ caretaker }) => ({
        id: null,
        email: caretaker.email,
      })),
      ...booking.room.building.caretakers.map(({ caretaker }) => ({
        id: null,
        email: caretaker.email,
      })),
    ],
  );

  const adminRecipients = await getAdminRecipients(client);

  const rows: Array<{
    eventCode: NotificationEventCode;
    recipientUserId?: string | null;
    recipient: string;
    bookingId?: string | null;
    payload: Prisma.InputJsonValue;
  }> = [];

  const pushRecipients = (
    recipients: Array<{ id?: string | null; email: string | null }>,
    note?: string,
  ) => {
    for (const recipient of recipients) {
      if (!recipient.email) {
        continue;
      }

      rows.push({
        eventCode,
        recipientUserId: recipient.id ?? null,
        recipient: recipient.email,
        bookingId: booking.id,
        payload: {
          ...payload,
          note,
        },
      });
    }
  };

  switch (eventCode) {
    case "BOOKING_REQUESTED":
      pushRecipients(requesterRecipients);
      pushRecipients(adminRecipients);
      break;
    case "BOOKING_IN_REVIEW":
      pushRecipients(requesterRecipients);
      break;
    case "BOOKING_APPROVED":
      pushRecipients(requesterRecipients, booking.decisionNote ?? undefined);
      pushRecipients(caretakerRecipients, booking.decisionNote ?? "Eine genehmigte Buchung betrifft Ihren Bereich.");
      break;
    case "BOOKING_REJECTED":
      pushRecipients(requesterRecipients, booking.decisionNote ?? undefined);
      break;
    case "BOOKING_CANCELLED":
      pushRecipients(requesterRecipients, booking.cancellationNote ?? "Die Buchung wurde storniert.");
      pushRecipients(adminRecipients, booking.cancellationNote ?? "Eine beantragte Buchung wurde storniert.");
      pushRecipients(caretakerRecipients, booking.cancellationNote ?? "Eine Buchung für Ihren Bereich wurde storniert.");
      break;
  }

  return queueNotificationRows(rows, client);
}

export async function queueBookingSeriesNotifications(
  seriesId: string,
  eventCode:
    | "BOOKING_SERIES_REQUESTED"
    | "BOOKING_SERIES_IN_REVIEW"
    | "BOOKING_SERIES_APPROVED"
    | "BOOKING_SERIES_REJECTED",
  summary: {
    createdCount?: number;
    skippedCount?: number;
    processedCount?: number;
    failedCount?: number;
    note?: string;
  } = {},
  client: NotificationClient = prisma,
) {
  const series = await client.bookingSeries.findUnique({
    where: { id: seriesId },
    select: {
      id: true,
      title: true,
      startsOn: true,
      endsOn: true,
      organization: {
        select: {
          name: true,
          members: {
            where: {
              activeFrom: { lte: new Date() },
              OR: [{ activeUntil: null }, { activeUntil: { gt: new Date() } }],
            },
            select: {
              user: {
                select: {
                  id: true,
                  email: true,
                  displayName: true,
                },
              },
              isPrimary: true,
            },
          },
        },
      },
      room: {
        select: {
          name: true,
          caretakers: {
            select: {
              caretaker: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
          building: {
            select: {
              name: true,
              caretakers: {
                select: {
                  caretaker: {
                    select: {
                      id: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      bookings: {
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          requestedBy: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          processedBy: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      },
    },
  });

  if (!series) {
    return [];
  }

  const firstBooking = series.bookings[0];
  const lastBooking = series.bookings.at(-1);
  const payload: BookingSeriesNotificationPayload = {
    seriesId: series.id,
    title: series.title,
    organizationName: series.organization.name,
    buildingName: series.room.building.name,
    roomName: series.room.name,
    startsAt: (firstBooking?.startsAt ?? series.startsOn).toISOString(),
    endsAt: (lastBooking?.endsAt ?? series.endsOn).toISOString(),
    createdCount: summary.createdCount ?? series.bookings.length,
    skippedCount: summary.skippedCount ?? 0,
    processedCount: summary.processedCount,
    failedCount: summary.failedCount,
    requestedByName: firstBooking?.requestedBy?.displayName ?? undefined,
    processedByName: firstBooking?.processedBy?.displayName ?? undefined,
    note: summary.note,
  };

  const requesterRecipients = dedupeRecipients(
    [
      firstBooking?.requestedBy
        ? {
            id: firstBooking.requestedBy.id,
            email: firstBooking.requestedBy.email,
          }
        : null,
      ...series.organization.members
        .filter((member) => member.isPrimary)
        .map((member) => ({
          id: member.user.id,
          email: member.user.email,
        })),
    ].filter(Boolean) as Array<{ id: string; email: string | null }>,
  );
  const caretakerRecipients = dedupeRecipients(
    [
      ...series.room.caretakers.map(({ caretaker }) => ({
        id: null,
        email: caretaker.email,
      })),
      ...series.room.building.caretakers.map(({ caretaker }) => ({
        id: null,
        email: caretaker.email,
      })),
    ],
  );
  const adminRecipients = await getAdminRecipients(client);

  const recipients =
    eventCode === "BOOKING_SERIES_REQUESTED"
      ? [...requesterRecipients, ...adminRecipients]
      : eventCode === "BOOKING_SERIES_APPROVED"
        ? [...requesterRecipients, ...caretakerRecipients]
        : requesterRecipients;

  return queueNotificationRows(
    dedupeRecipients(recipients)
      .filter((recipient) => recipient.email)
      .map((recipient) => ({
        eventCode,
        recipientUserId: recipient.id ?? null,
        recipient: recipient.email!,
        payload,
      })),
    client,
  );
}

export async function queueBookingChangeNotifications(
  changeRequestId: string,
  eventCode:
    | "BOOKING_CHANGE_REQUESTED"
    | "BOOKING_CHANGE_IN_REVIEW"
    | "BOOKING_CHANGE_APPROVED"
    | "BOOKING_CHANGE_REJECTED",
  client: NotificationClient = prisma,
) {
  const request = await client.bookingChangeRequest.findUnique({
    where: { id: changeRequestId },
    include: {
      booking: {
        include: {
          organization: {
            include: {
              members: {
                where: {
                  activeFrom: { lte: new Date() },
                  OR: [{ activeUntil: null }, { activeUntil: { gt: new Date() } }],
                },
                include: {
                  user: { select: { id: true, email: true, displayName: true } },
                },
              },
            },
          },
        },
      },
      oldRoom: { include: { building: true } },
      newRoom: { include: { building: true } },
      requestedBy: { select: { id: true, email: true, displayName: true } },
      decidedBy: { select: { id: true, email: true, displayName: true } },
    },
  });

  if (!request) {
    return [];
  }

  const payload: BookingChangeNotificationPayload = {
    changeRequestId: request.id,
    bookingId: request.bookingId,
    title: request.booking.title,
    organizationName: request.booking.organization.name,
    oldBuildingName: request.oldRoom.building.name,
    oldRoomName: request.oldRoom.name,
    newBuildingName: request.newRoom.building.name,
    newRoomName: request.newRoom.name,
    oldStartAt: request.oldStartAt.toISOString(),
    oldEndAt: request.oldEndAt.toISOString(),
    newStartAt: request.newStartAt.toISOString(),
    newEndAt: request.newEndAt.toISOString(),
    requestedByName: request.requestedBy.displayName ?? undefined,
    processedByName: request.decidedBy?.displayName ?? undefined,
    reason: request.reason,
    note: request.decisionNote ?? undefined,
  };
  const requesterRecipients = dedupeRecipients(
    [
      { id: request.requestedBy.id, email: request.requestedBy.email },
      ...request.booking.organization.members
        .filter((member) => member.isPrimary)
        .map((member) => ({ id: member.user.id, email: member.user.email })),
    ],
  );
  const adminRecipients = await getAdminRecipients(client);

  const recipients = eventCode === "BOOKING_CHANGE_REQUESTED" ? [...requesterRecipients, ...adminRecipients] : requesterRecipients;

  return queueNotificationRows(
    dedupeRecipients(recipients)
      .filter((recipient) => recipient.email)
      .map((recipient) => ({
        eventCode,
        recipientUserId: recipient.id,
        recipient: recipient.email!,
        payload,
      })),
    client,
  );
}

export async function queueClosureCreatedNotification(
  closureId: string,
  client: NotificationClient = prisma,
) {
  const closure = await client.closure.findUnique({
    where: { id: closureId },
    include: {
      building: {
        include: {
          caretakers: { include: { caretaker: true } },
        },
      },
      room: {
        include: {
          building: {
            include: {
              caretakers: { include: { caretaker: true } },
            },
          },
          caretakers: { include: { caretaker: true } },
        },
      },
    },
  });

  if (!closure) {
    return [];
  }

  const targetName = closure.room
    ? `${closure.room.building.name} - ${closure.room.name}`
    : closure.building?.name ?? "Sperre";

  const affectedBookingsRaw = await client.booking.findMany({
    where: {
      status: { in: ["REQUESTED", "IN_REVIEW", "APPROVED"] },
      startsAt: { lt: closure.endsAt },
      endsAt: { gt: closure.startsAt },
      ...(closure.roomId
        ? { roomId: closure.roomId }
        : { room: { buildingId: closure.buildingId! } }),
    },
    select: {
      id: true,
      title: true,
      status: true,
      startsAt: true,
      endsAt: true,
      usageType: { select: { name: true } },
      organization: { select: { name: true } },
      room: { select: { name: true, building: { select: { name: true } } } },
    },
    orderBy: { startsAt: "asc" },
  });

  const payload: ClosureNotificationPayload = {
    closureId: closure.id,
    targetName,
    targetType: closure.roomId ? "ROOM" : "BUILDING",
    status: closure.status,
    reason: closure.reason,
    startsAt: closure.startsAt.toISOString(),
    endsAt: closure.endsAt.toISOString(),
    isPublic: closure.isPublic,
    affectedBookings: affectedBookingsRaw.map((b) => ({
      bookingId: b.id,
      title: b.title,
      organizationName: b.organization.name,
      buildingName: b.room.building.name,
      roomName: b.room.name,
      usageTypeName: b.usageType.name,
      status: getBookingStatusLabel(b.status),
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
    })),
  };
  const caretakerRecipients = dedupeRecipients(
    closure.room
      ? [
          ...closure.room.caretakers.map(({ caretaker }) => ({ id: null, email: caretaker.email })),
          ...closure.room.building.caretakers.map(({ caretaker }) => ({ id: null, email: caretaker.email })),
        ]
      : [
          ...(closure.building?.caretakers.map(({ caretaker }) => ({ id: null, email: caretaker.email })) ?? []),
        ],
  );
  const adminRecipients = await getAdminRecipients(client);

  return queueNotificationRows(
    dedupeRecipients([...caretakerRecipients, ...adminRecipients])
      .filter((recipient) => recipient.email)
      .map((recipient) => ({
        eventCode: "CLOSURE_CREATED",
        recipientUserId: recipient.id,
        recipient: recipient.email!,
        payload,
      })),
    client,
  );
}

export async function queueUserAccountNotification(
  userId: string,
  eventCode: "USER_ACCOUNT_CREATED" | "USER_ACCOUNT_DEACTIVATED",
  note?: string,
  client: NotificationClient = prisma,
) {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true },
  });

  if (!user?.email) {
    return [];
  }

  const payload: UserAccountNotificationPayload = {
    userId: user.id,
    displayName: user.displayName ?? user.email,
    email: user.email,
    note,
  };

  return queueNotificationRows(
    [
      {
        eventCode,
        recipientUserId: user.id,
        recipient: user.email,
        payload,
      },
    ],
    client,
  );
}

export async function queueOrganizationStatusNotification(
  organizationId: string,
  affectedUserCount: number,
  client: NotificationClient = prisma,
) {
  const organization = await client.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      status: true,
      blockedReason: true,
    },
  });

  if (!organization || organization.status === "ACTIVE") {
    return [];
  }

  const payload: OrganizationNotificationPayload = {
    organizationId: organization.id,
    organizationName: organization.name,
    status: organization.status,
    reason: organization.blockedReason ?? undefined,
    affectedUserCount,
  };
  const adminRecipients = await getAdminRecipients(client);

  return queueNotificationRows(
    adminRecipients
      .filter((recipient) => recipient.email)
      .map((recipient) => ({
        eventCode: "ORGANIZATION_BLOCKED",
        recipientUserId: recipient.id,
        recipient: recipient.email!,
        payload,
      })),
    client,
  );
}

export async function queueAdminTestEmail(
  {
    recipient,
    actorUserId,
    note,
  }: {
    recipient: string;
    actorUserId: string;
    note?: string;
  },
  client: NotificationClient = prisma,
) {
  const actor = await client.user.findUnique({
    where: { id: actorUserId },
    select: { displayName: true, email: true },
  });
  const payload = {
    recipient,
    requestedByName: actor?.displayName ?? actor?.email ?? undefined,
    createdAt: new Date().toISOString(),
    note,
  };

  return queueNotificationRows(
    [
      {
        eventCode: "ADMIN_TEST_EMAIL",
        recipientUserId: null,
        recipient,
        payload,
      },
    ],
    client,
  );
}

export async function getNotificationRecipientPreview(client: NotificationClient = prisma) {
  const [admins, activeUsers, caretakers, organizations] = await Promise.all([
    getAdminRecipients(client),
    client.user.count({ where: { isActive: true } }),
    client.user.count({
      where: {
        isActive: true,
        caretakerProfile: { isNot: null },
      },
    }),
    client.organization.count({ where: { status: "ACTIVE", canRequestBookings: true } }),
  ]);

  return [
    { label: "Verwaltung / Genehmigung", count: admins.length, description: "Empfänger für neue Anträge, Sperren und Systemmeldungen." },
    { label: "Aktive Benutzer", count: activeUsers, description: "Potenzielle direkte Empfänger für Konto- und Portalereignisse." },
    { label: "Hallenwarte", count: caretakers, description: "Empfänger für Sperren, Genehmigungen, Schäden und No-Shows nach Zuordnung." },
    { label: "Aktive buchungsberechtigte Organisationen", count: organizations, description: "Organisationen mit möglichem Mailverkehr über Kontaktpersonen." },
  ];
}

export async function queueWaitlistOfferNotification(
  waitlistEntryId: string,
  offerExpiresAt: Date,
  client: NotificationClient = prisma,
) {
  const entry = await client.waitlistEntry.findUnique({
    where: { id: waitlistEntryId },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      requestedBy: {
        select: {
          id: true,
          email: true,
        },
      },
      organization: {
        select: {
          name: true,
        },
      },
      room: {
        select: {
          name: true,
          building: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!entry?.requestedBy?.email) {
    return [];
  }

  const payload: WaitlistNotificationPayload = {
    waitlistEntryId: entry.id,
    title: entry.title,
    organizationName: entry.organization.name,
    buildingName: entry.room.building.name,
    roomName: entry.room.name,
    startsAt: entry.startsAt.toISOString(),
    endsAt: entry.endsAt.toISOString(),
    offerExpiresAt: offerExpiresAt.toISOString(),
  };

  return queueNotificationRows(
    [
      {
        eventCode: "WAITLIST_OFFER_CREATED",
        waitlistEntryId: entry.id,
        recipientUserId: entry.requestedBy.id,
        recipient: entry.requestedBy.email,
        payload,
      },
    ],
    client,
  );
}

export async function queueWaitlistExpiredNotification(
  waitlistEntryId: string,
  offerExpiresAt: Date,
  client: NotificationClient = prisma,
) {
  const entry = await client.waitlistEntry.findUnique({
    where: { id: waitlistEntryId },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      requestedBy: {
        select: {
          id: true,
          email: true,
        },
      },
      organization: {
        select: {
          name: true,
        },
      },
      room: {
        select: {
          name: true,
          building: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!entry?.requestedBy?.email) {
    return [];
  }

  const payload: WaitlistNotificationPayload = {
    waitlistEntryId: entry.id,
    title: entry.title,
    organizationName: entry.organization.name,
    buildingName: entry.room.building.name,
    roomName: entry.room.name,
    startsAt: entry.startsAt.toISOString(),
    endsAt: entry.endsAt.toISOString(),
    offerExpiresAt: offerExpiresAt.toISOString(),
  };

  return queueNotificationRows(
    [
      {
        eventCode: "WAITLIST_OFFER_EXPIRED",
        waitlistEntryId: entry.id,
        recipientUserId: entry.requestedBy.id,
        recipient: entry.requestedBy.email,
        payload,
      },
    ],
    client,
  );
}

export async function queueDamageReportedNotification(
  damageReportId: string,
  client: NotificationClient = prisma,
) {
  const damage = await client.damageReport.findUnique({
    where: { id: damageReportId },
    select: {
      id: true,
      description: true,
      reportedAt: true,
      reportedBy: { select: { displayName: true } },
      room: {
        select: {
          name: true,
          caretakers: {
            select: {
              caretaker: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
          building: {
            select: {
              name: true,
              caretakers: {
                select: {
                  caretaker: {
                    select: {
                      id: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!damage) {
    return [];
  }

  const payload: DamageNotificationPayload = {
    damageReportId: damage.id,
    buildingName: damage.room.building.name,
    roomName: damage.room.name,
    reportedByName: damage.reportedBy?.displayName ?? undefined,
    description: damage.description,
    reportedAt: damage.reportedAt.toISOString(),
  };

  const adminRecipients = await getAdminRecipients(client);
  const caretakerRecipients = dedupeRecipients(
    [
      ...damage.room.caretakers.map(({ caretaker }) => ({
        id: null,
        email: caretaker.email,
      })),
      ...damage.room.building.caretakers.map(({ caretaker }) => ({
        id: null,
        email: caretaker.email,
      })),
    ],
  );

  return queueNotificationRows(
    [...adminRecipients, ...caretakerRecipients]
      .filter((recipient) => recipient.email)
      .map((recipient) => ({
        eventCode: "DAMAGE_REPORTED",
        recipientUserId: recipient.id,
        recipient: recipient.email!,
        payload,
      })),
    client,
  );
}

export async function queueNoShowReportedNotification(
  noShowReportId: string,
  client: NotificationClient = prisma,
) {
  const enabled = await isNotificationEventEnabled("NO_SHOW_REPORTED", client);
  if (!enabled) {
    return [];
  }

  const report = await client.noShowReport.findUnique({
    where: { id: noShowReportId },
    include: {
      reportedBy: { select: { displayName: true } },
      organization: { select: { name: true } },
      booking: { select: { id: true, title: true, startsAt: true, endsAt: true } },
      room: { include: { building: { select: { name: true } } } },
    },
  });

  if (!report) {
    return [];
  }

  const payload: NoShowNotificationPayload = {
    noShowReportId: report.id,
    bookingId: report.booking.id,
    title: report.booking.title,
    organizationName: report.organization.name,
    buildingName: report.room.building.name,
    roomName: report.room.name,
    startsAt: report.booking.startsAt.toISOString(),
    endsAt: report.booking.endsAt.toISOString(),
    reportedByName: report.reportedBy?.displayName ?? undefined,
    description: report.description,
    reportedAt: report.reportedAt.toISOString(),
  };

  const adminRecipients = await getAdminRecipients(client);

  return queueNotificationRows(
    adminRecipients
      .filter((recipient) => recipient.email)
      .map((recipient) => ({
        eventCode: "NO_SHOW_REPORTED",
        recipientUserId: recipient.id,
        recipient: recipient.email!,
        payload,
      })),
    client,
  );
}

function calculateNextAttemptAt(attemptCount: number, now: Date) {
  const delayMinutes = Math.min(
    baseRetryDelayMinutes * 2 ** Math.max(attemptCount - 1, 0),
    maxRetryDelayMinutes,
  );
  return new Date(now.getTime() + delayMinutes * 60 * 1000);
}

async function sendNotificationRecord(
  notificationId: string,
  client: NotificationClient,
  dependencies: NotificationDeliveryDependencies = {},
  options: { force?: boolean } = {},
) {
  const now = dependencies.now?.() ?? new Date();
  const notification = await client.notification.findUnique({
    where: { id: notificationId },
    select: {
      id: true,
      eventCode: true,
      recipient: true,
      payload: true,
      status: true,
      attemptCount: true,
      maxAttempts: true,
      nextAttemptAt: true,
    },
  });

  if (!notification) {
    throw new Error("Die Benachrichtigung wurde nicht gefunden.");
  }

  if (notification.status === "SENT") {
    return client.notification.findUnique({
      where: { id: notificationId },
      select: notificationListSelect,
    });
  }

  if (!options.force && notification.nextAttemptAt && notification.nextAttemptAt > now) {
    return client.notification.findUnique({
      where: { id: notificationId },
      select: notificationListSelect,
    });
  }

  if (!options.force && notification.attemptCount >= notification.maxAttempts) {
    return client.notification.findUnique({
      where: { id: notificationId },
      select: notificationListSelect,
    });
  }

  const sendMail = dependencies.sendMail ?? sendEmail;
  const nextAttemptCount = notification.attemptCount + 1;

  try {
    const template = renderNotificationTemplate({
      eventCode: notification.eventCode,
      payload: notification.payload,
    });

    await sendMail({
      to: notification.recipient,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });

    await client.notification.update({
      where: { id: notificationId },
      data: {
        status: "SENT",
        sentAt: now,
        attemptCount: nextAttemptCount,
        nextAttemptAt: null,
        lastError: null,
        errorMessage: null,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof MailDeliveryError || error instanceof Error
        ? error.message
        : "Die E-Mail konnte nicht versendet werden.";

    await client.notification.update({
      where: { id: notificationId },
      data: {
        status: "FAILED",
        attemptCount: nextAttemptCount,
        nextAttemptAt:
          nextAttemptCount >= notification.maxAttempts
            ? null
            : calculateNextAttemptAt(nextAttemptCount, now),
        lastError: errorMessage,
        errorMessage,
      },
    });
  }

  return client.notification.findUnique({
    where: { id: notificationId },
    select: notificationListSelect,
  });
}

export async function sendPendingNotification(
  notificationId: string,
  client: NotificationClient = prisma,
  dependencies: NotificationDeliveryDependencies = {},
) {
  return sendNotificationRecord(notificationId, client, dependencies);
}

export async function processPendingNotifications(
  limit = 25,
  client: NotificationClient = prisma,
  dependencies: NotificationDeliveryDependencies = {},
) {
  const now = dependencies.now?.() ?? new Date();
  const pending = await client.notification.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      channel: "EMAIL",
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });

  const results: Array<NotificationListRecord | null> = [];
  for (const notification of pending) {
    results.push(await sendNotificationRecord(notification.id, client, dependencies));
  }

  return results;
}

export async function retryFailedNotification(
  notificationId: string,
  actorUserId: string,
  dependencies: NotificationDeliveryDependencies = {},
  client: NotificationClient = prisma,
  permissions: { canView?: boolean } = {},
) {
  const canView =
    typeof permissions.canView === "boolean"
      ? permissions.canView
      : await hasPermission(actorUserId, "VIEW_BOOKINGS");
  if (!canView) {
    throw new Error("Sie dürfen Benachrichtigungen nicht erneut versenden.");
  }

  return sendNotificationRecord(notificationId, client, dependencies, { force: true });
}

export async function retryNotification(
  notificationId: string,
  actorUserId: string,
  dependencies: NotificationDeliveryDependencies = {},
  client: NotificationClient = prisma,
  permissions: { canView?: boolean } = {},
) {
  return retryFailedNotification(notificationId, actorUserId, dependencies, client, permissions);
}

export async function getNotificationsForAdmin(
  actorUserId: string,
  filter: NotificationEventStatusFilter = "ALL",
  client: NotificationClient = prisma,
  permissions: { canView?: boolean } = {},
) {
  const canView =
    typeof permissions.canView === "boolean"
      ? permissions.canView
      : await hasPermission(actorUserId, "VIEW_BOOKINGS");
  if (!canView) {
    throw new Error("Sie dürfen Benachrichtigungen nicht einsehen.");
  }

  return client.notification.findMany({
    where: filter === "ALL" ? undefined : { status: filter },
    orderBy: { createdAt: "desc" },
    select: notificationListSelect,
  });
}
