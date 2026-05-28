import assert from "node:assert/strict";
import test from "node:test";
import {
  processPendingNotifications,
  queueBookingNotifications,
  retryNotification,
} from "../lib/services/notification-service";
import { renderNotificationTemplate } from "../lib/services/notification-template-service";

function createNotificationHarness() {
  const notifications: Array<Record<string, unknown>> = [];
  const booking = {
    id: "booking-1",
    title: "Abendtraining",
    startsAt: new Date("2026-06-12T18:00:00Z"),
    endsAt: new Date("2026-06-12T20:00:00Z"),
    requestedBy: {
      id: "user-requester",
      email: "requester@example.test",
      displayName: "Antragsteller",
    },
    processedBy: {
      id: "user-admin",
      email: "admin@example.test",
      displayName: "Gemeinde Admin",
    },
    organization: {
      name: "Verein Blau",
      members: [
        {
          isPrimary: true,
          user: {
            id: "user-primary",
            email: "primary@example.test",
            displayName: "Kontaktperson",
          },
        },
      ],
    },
    room: {
      name: "Turnsaal",
      caretakers: [
        {
          caretaker: {
            id: "caretaker-room",
            email: "caretaker-room@example.test",
            name: "Room Caretaker",
          },
        },
      ],
      building: {
        name: "Volksschule Hauptplatz",
        caretakers: [
          {
            caretaker: {
              id: "caretaker-building",
              email: "caretaker-building@example.test",
              name: "Building Caretaker",
            },
          },
        ],
      },
    },
  };
  const adminUsers = [
    {
      id: "user-admin",
      displayName: "Gemeinde Admin",
      email: "admin@example.test",
    },
  ];

  const client = {
    booking: {
      async findUnique() {
        return booking;
      },
    },
    waitlistEntry: {
      async findUnique() {
        return null;
      },
    },
    user: {
      async findMany() {
        return adminUsers;
      },
    },
    notification: {
      async create(args: { data: Record<string, unknown>; select: { id: true } }) {
        const created = {
          id: `notification-${notifications.length + 1}`,
          status: "PENDING",
          channel: "EMAIL",
          createdAt: new Date("2026-05-28T12:00:00Z"),
          sentAt: null,
          errorMessage: null,
          bookingId: args.data.bookingId ?? null,
          waitlistEntryId: args.data.waitlistEntryId ?? null,
          recipientUserId: args.data.recipientUserId ?? null,
          eventCode: args.data.eventCode,
          recipient: args.data.recipient,
          payload: args.data.payload,
          booking: null,
          waitlistEntry: null,
          recipientUser: null,
        };
        notifications.push(created);
        return { id: created.id };
      },
      async findMany(args: { where?: Record<string, unknown>; take?: number; orderBy?: Record<string, unknown>; select?: { id: true } }) {
        const statuses = ((args.where?.status as { in?: string[] } | undefined)?.in) ?? null;
        const records = notifications.filter((notification) =>
          statuses ? statuses.includes(String(notification.status)) : true,
        );

        if (args.select?.id) {
          return records.map((notification) => ({ id: String(notification.id) }));
        }

        return records;
      },
      async findUnique(args: { where: { id: string }; select?: Record<string, unknown> }) {
        const notification = notifications.find((entry) => entry.id === args.where.id) ?? null;
        return notification;
      },
      async update(args: { where: { id: string }; data: Record<string, unknown> }) {
        const notification = notifications.find((entry) => entry.id === args.where.id);
        if (!notification) {
          throw new Error("notification missing");
        }

        Object.assign(notification, args.data);
        return notification;
      },
    },
  };

  return {
    notifications,
    client,
  };
}

test("queues booking requested notifications for requester and admin recipients", async () => {
  const harness = createNotificationHarness();

  const ids = await queueBookingNotifications("booking-1", "BOOKING_REQUESTED", harness.client as never);

  assert.equal(ids.length, 3);
  assert.deepEqual(
    harness.notifications.map((notification) => notification.recipient),
    ["requester@example.test", "primary@example.test", "admin@example.test"],
  );
});

test("renders the booking approval template with title and note", async () => {
  const template = renderNotificationTemplate({
    eventCode: "BOOKING_APPROVED",
    payload: {
      bookingId: "booking-1",
      title: "Abendtraining",
      organizationName: "Verein Blau",
      buildingName: "Volksschule Hauptplatz",
      roomName: "Turnsaal",
      startsAt: "2026-06-12T18:00:00.000Z",
      endsAt: "2026-06-12T20:00:00.000Z",
      note: "Freigegeben.",
    },
  });

  assert.match(template.subject, /Buchung genehmigt/);
  assert.match(template.text, /Abendtraining/);
  assert.match(template.text, /Freigegeben/);
  assert.match(template.html, /Verein Blau/);
});

test("marks a notification as failed when mail delivery throws", async () => {
  const harness = createNotificationHarness();
  await queueBookingNotifications("booking-1", "BOOKING_REQUESTED", harness.client as never);

  const processed = await processPendingNotifications(1, harness.client as never, {
    sendMail: async () => {
      throw new Error("SMTP offline");
    },
  });

  assert.equal(processed[0]?.status, "FAILED");
  assert.equal(processed[0]?.errorMessage, "SMTP offline");
});

test("retries a failed notification and marks it as sent", async () => {
  const harness = createNotificationHarness();
  await queueBookingNotifications("booking-1", "BOOKING_REQUESTED", harness.client as never);
  const target = harness.notifications[0]!;
  target.status = "FAILED";
  target.errorMessage = "Vorheriger Fehler";

  const retried = await retryNotification("notification-1", "user-admin", {
    sendMail: async () => ({ messageId: "mail-1" }),
  }, harness.client as never, { canView: true });

  assert.equal(retried?.status, "SENT");
  assert.equal(retried?.errorMessage, null);
  assert.ok(retried?.sentAt instanceof Date);
});
