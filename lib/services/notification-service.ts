import type { Prisma, PrismaClient } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { MailDeliveryError, sendEmail, type MailPayload } from "@/lib/services/mail-service";
import { renderNotificationTemplate } from "@/lib/services/notification-template-service";
import type {
  BookingNotificationPayload,
  NotificationEventCode,
  WaitlistNotificationPayload,
} from "@/lib/services/notification-types";

type NotificationEventStatusFilter = "ALL" | "PENDING" | "SENT" | "FAILED";

type NotificationClient = Pick<
  PrismaClient,
  "notification" | "booking" | "waitlistEntry" | "user"
>;

type MailSender = (payload: MailPayload) => Promise<unknown>;

type NotificationDeliveryDependencies = {
  sendMail?: MailSender;
};

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

  for (const row of rows) {
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
      startsAt: true,
      endsAt: true,
      decisionNote: true,
      cancellationNote: true,
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
        id: caretaker.id,
        email: caretaker.email,
      })),
      ...booking.room.building.caretakers.map(({ caretaker }) => ({
        id: caretaker.id,
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
      pushRecipients(caretakerRecipients, booking.cancellationNote ?? "Eine Buchung fuer Ihren Bereich wurde storniert.");
      break;
  }

  return queueNotificationRows(rows, client);
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

async function sendNotificationRecord(
  notificationId: string,
  client: NotificationClient,
  dependencies: NotificationDeliveryDependencies = {},
) {
  const notification = await client.notification.findUnique({
    where: { id: notificationId },
    select: {
      id: true,
      eventCode: true,
      recipient: true,
      payload: true,
      status: true,
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

  const template = renderNotificationTemplate({
    eventCode: notification.eventCode,
    payload: notification.payload,
  });

  const sendMail = dependencies.sendMail ?? sendEmail;

  try {
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
        sentAt: new Date(),
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
        errorMessage,
      },
    });
  }

  return client.notification.findUnique({
    where: { id: notificationId },
    select: notificationListSelect,
  });
}

export async function processPendingNotifications(
  limit = 25,
  client: NotificationClient = prisma,
  dependencies: NotificationDeliveryDependencies = {},
) {
  const pending = await client.notification.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      channel: "EMAIL",
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

export async function retryNotification(
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
    throw new Error("Sie duerfen Benachrichtigungen nicht erneut versenden.");
  }

  return sendNotificationRecord(notificationId, client, dependencies);
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
    throw new Error("Sie duerfen Benachrichtigungen nicht einsehen.");
  }

  return client.notification.findMany({
    where: filter === "ALL" ? undefined : { status: filter },
    orderBy: { createdAt: "desc" },
    select: notificationListSelect,
  });
}
