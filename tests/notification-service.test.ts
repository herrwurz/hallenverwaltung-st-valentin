import assert from "node:assert/strict";
import test from "node:test";
import {
  processPendingNotifications,
  queueBookingNotifications,
  retryFailedNotification,
} from "../lib/services/notification-service";
import { renderNotificationTemplate } from "../lib/services/notification-template-service";

function createNotificationHarness() {
  const notifications: Array<Record<string, unknown>> = [];
  const settings = new Map<string, unknown>();
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
          attemptCount: args.data.attemptCount ?? 0,
          maxAttempts: args.data.maxAttempts ?? 5,
          nextAttemptAt: args.data.nextAttemptAt ?? null,
          lastError: args.data.lastError ?? null,
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
        const now = new Date("2026-05-28T12:00:00Z");
        const records = notifications.filter((notification) => {
          const statusMatches = statuses ? statuses.includes(String(notification.status)) : true;
          const nextAttemptAt = notification.nextAttemptAt as Date | null;
          const nextAttemptMatches = args.where?.OR
            ? nextAttemptAt === null || nextAttemptAt <= now
            : true;
          return statusMatches && nextAttemptMatches;
        });

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
    systemSetting: {
      async findUnique(args: { where: { key: string }; select?: { value: true } }) {
        if (!settings.has(args.where.key)) {
          return null;
        }

        return { value: settings.get(args.where.key) };
      },
      async upsert(args: { where: { key: string }; update: { value: unknown }; create: { key: string; value: unknown } }) {
        const value = settings.has(args.where.key) ? args.update.value : args.create.value;
        settings.set(args.where.key, value);
        return { id: "setting-1", key: args.where.key, value, updatedAt: new Date("2026-05-28T12:00:00Z") };
      },
    },
  };

  return {
    notifications,
    settings,
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
    now: () => new Date("2026-05-28T12:00:00Z"),
    sendMail: async () => {
      throw new Error("SMTP offline");
    },
  });

  assert.equal(processed[0]?.status, "FAILED");
  assert.equal(processed[0]?.errorMessage, "SMTP offline");
  assert.equal(processed[0]?.lastError, "SMTP offline");
  assert.equal(processed[0]?.attemptCount, 1);
  assert.ok(processed[0]?.nextAttemptAt instanceof Date);
});

test("retries a failed notification and marks it as sent", async () => {
  const harness = createNotificationHarness();
  await queueBookingNotifications("booking-1", "BOOKING_REQUESTED", harness.client as never);
  const target = harness.notifications[0]!;
  target.status = "FAILED";
  target.errorMessage = "Vorheriger Fehler";

  const retried = await retryFailedNotification("notification-1", "user-admin", {
    sendMail: async () => ({ messageId: "mail-1" }),
  }, harness.client as never, { canView: true });

  assert.equal(retried?.status, "SENT");
  assert.equal(retried?.errorMessage, null);
  assert.equal(retried?.lastError, null);
  assert.ok(retried?.sentAt instanceof Date);
});

test("does not queue notifications for disabled events", async () => {
  const harness = createNotificationHarness();
  harness.settings.set("notifications.events.enabled", {
    BOOKING_REQUESTED: false,
  });

  const ids = await queueBookingNotifications("booking-1", "BOOKING_REQUESTED", harness.client as never);

  assert.deepEqual(ids, []);
  assert.equal(harness.notifications.length, 0);
});

test("respects nextAttemptAt before processing failed notifications", async () => {
  const harness = createNotificationHarness();
  await queueBookingNotifications("booking-1", "BOOKING_REQUESTED", harness.client as never);
  const target = harness.notifications[0]!;
  for (const notification of harness.notifications.slice(1)) {
    notification.status = "SENT";
  }
  target.status = "FAILED";
  target.attemptCount = 1;
  target.nextAttemptAt = new Date("2026-05-28T13:00:00Z");

  let sent = 0;
  await processPendingNotifications(10, harness.client as never, {
    now: () => new Date("2026-05-28T12:00:00Z"),
    sendMail: async () => {
      sent += 1;
    },
  });

  assert.equal(sent, 0);
  assert.equal(target.attemptCount, 1);
});

test("maxAttempts prevents automated retry loops", async () => {
  const harness = createNotificationHarness();
  await queueBookingNotifications("booking-1", "BOOKING_REQUESTED", harness.client as never);
  const target = harness.notifications[0]!;
  for (const notification of harness.notifications.slice(1)) {
    notification.status = "SENT";
  }
  target.status = "FAILED";
  target.attemptCount = 2;
  target.maxAttempts = 2;
  target.nextAttemptAt = null;

  let sent = 0;
  await processPendingNotifications(10, harness.client as never, {
    sendMail: async () => {
      sent += 1;
    },
  });

  assert.equal(sent, 0);
  assert.equal(target.attemptCount, 2);
});
