import assert from "node:assert/strict";
import test from "node:test";
import {
  processPendingNotifications,
  queueAdminTestEmail,
  queueBookingChangeNotifications,
  queueBookingNotifications,
  queueBookingSeriesNotifications,
  queueClosureCreatedNotification,
  queueOrganizationStatusNotification,
  queueUserAccountNotification,
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
  const bookingSeries = {
    id: "series-1",
    title: "Serientraining",
    startsOn: new Date("2026-06-12T18:00:00Z"),
    endsOn: new Date("2026-07-10T20:00:00Z"),
    organization: booking.organization,
    room: booking.room,
    bookings: [
      {
        id: "booking-1",
        startsAt: new Date("2026-06-12T18:00:00Z"),
        endsAt: new Date("2026-06-12T20:00:00Z"),
        requestedBy: booking.requestedBy,
        processedBy: booking.processedBy,
      },
      {
        id: "booking-2",
        startsAt: new Date("2026-06-19T18:00:00Z"),
        endsAt: new Date("2026-06-19T20:00:00Z"),
        requestedBy: booking.requestedBy,
        processedBy: booking.processedBy,
      },
    ],
  };
  const bookingChangeRequest = {
    id: "change-1",
    bookingId: "booking-1",
    reason: "Training muss verschoben werden.",
    decisionNote: "Verschiebung ist möglich.",
    oldStartAt: new Date("2026-06-12T18:00:00Z"),
    oldEndAt: new Date("2026-06-12T20:00:00Z"),
    newStartAt: new Date("2026-06-13T18:00:00Z"),
    newEndAt: new Date("2026-06-13T20:00:00Z"),
    booking,
    oldRoom: {
      name: "Turnsaal",
      building: {
        name: "Volksschule Hauptplatz",
      },
    },
    newRoom: {
      name: "Sporthalle",
      building: {
        name: "NMS Langenhart",
      },
    },
    requestedBy: booking.requestedBy,
    decidedBy: booking.processedBy,
  };
  const closure = {
    id: "closure-1",
    roomId: "room-1",
    buildingId: null,
    status: "CLOSED",
    reason: "Reinigung",
    startsAt: new Date("2026-06-12T08:00:00Z"),
    endsAt: new Date("2026-06-12T12:00:00Z"),
    isPublic: true,
    building: null,
    room: booking.room,
  };
  const usersById = new Map([
    [
      "user-requester",
      {
        id: "user-requester",
        email: "requester@example.test",
        displayName: "Antragsteller",
      },
    ],
    [
      "user-admin",
      {
        id: "user-admin",
        email: "admin@example.test",
        displayName: "Gemeinde Admin",
      },
    ],
  ]);
  const organization = {
    id: "org-1",
    name: "Verein Blau",
    status: "BLOCKED",
    blockedReason: "Offene Rückfragen zur Zuständigkeit.",
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
    bookingSeries: {
      async findUnique() {
        return bookingSeries;
      },
    },
    bookingChangeRequest: {
      async findUnique() {
        return bookingChangeRequest;
      },
    },
    closure: {
      async findUnique() {
        return closure;
      },
    },
    organization: {
      async findUnique() {
        return organization;
      },
      async count() {
        return 1;
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
      async findUnique(args: { where: { id: string } }) {
        return usersById.get(args.where.id) ?? null;
      },
      async count() {
        return 2;
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

test("queues one booking series requested summary for requester primary contact and admin", async () => {
  const harness = createNotificationHarness();

  const ids = await queueBookingSeriesNotifications(
    "series-1",
    "BOOKING_SERIES_REQUESTED",
    { createdCount: 2, skippedCount: 1, note: "Ein Termin wurde übersprungen." },
    harness.client as never,
  );

  assert.equal(ids.length, 3);
  assert.deepEqual(
    harness.notifications.map((notification) => notification.recipient),
    ["requester@example.test", "primary@example.test", "admin@example.test"],
  );
  assert.equal(harness.notifications[0]?.eventCode, "BOOKING_SERIES_REQUESTED");
  assert.equal((harness.notifications[0]?.payload as { createdCount?: number }).createdCount, 2);
});

test("renders booking series approval template with summarized counts", () => {
  const template = renderNotificationTemplate({
    eventCode: "BOOKING_SERIES_APPROVED",
    payload: {
      seriesId: "series-1",
      title: "Serientraining",
      organizationName: "Verein Blau",
      buildingName: "Volksschule Hauptplatz",
      roomName: "Turnsaal",
      startsAt: "2026-06-12T18:00:00.000Z",
      endsAt: "2026-07-10T20:00:00.000Z",
      createdCount: 5,
      skippedCount: 1,
      processedCount: 5,
      failedCount: 0,
      note: "Freigegeben.",
    },
  });

  assert.match(template.subject, /Serienbuchung genehmigt/);
  assert.match(template.text, /Serientraining/);
  assert.match(template.text, /Verarbeitete Termine: 5/);
  assert.match(template.html, /Freigegeben/);
});

test("queues booking change requested notifications for requester primary contact and admin", async () => {
  const harness = createNotificationHarness();

  const ids = await queueBookingChangeNotifications("change-1", "BOOKING_CHANGE_REQUESTED", harness.client as never);

  assert.equal(ids.length, 3);
  assert.deepEqual(
    harness.notifications.map((notification) => notification.recipient),
    ["requester@example.test", "primary@example.test", "admin@example.test"],
  );
  assert.equal(harness.notifications[0]?.eventCode, "BOOKING_CHANGE_REQUESTED");
  assert.equal((harness.notifications[0]?.payload as { newRoomName?: string }).newRoomName, "Sporthalle");
});

test("renders booking change approval template with old and new slot", () => {
  const template = renderNotificationTemplate({
    eventCode: "BOOKING_CHANGE_APPROVED",
    payload: {
      changeRequestId: "change-1",
      bookingId: "booking-1",
      title: "Abendtraining",
      organizationName: "Verein Blau",
      oldBuildingName: "Volksschule Hauptplatz",
      oldRoomName: "Turnsaal",
      newBuildingName: "NMS Langenhart",
      newRoomName: "Sporthalle",
      oldStartAt: "2026-06-12T18:00:00.000Z",
      oldEndAt: "2026-06-12T20:00:00.000Z",
      newStartAt: "2026-06-13T18:00:00.000Z",
      newEndAt: "2026-06-13T20:00:00.000Z",
      reason: "Training muss verschoben werden.",
      note: "Verschiebung ist möglich.",
    },
  });

  assert.match(template.subject, /Verschiebung genehmigt/);
  assert.match(template.text, /Volksschule Hauptplatz/);
  assert.match(template.text, /NMS Langenhart/);
  assert.match(template.html, /Verschiebung ist mÃ¶glich|Verschiebung ist möglich/);
});

test("queues closure notifications for caretakers and admin recipients", async () => {
  const harness = createNotificationHarness();

  const ids = await queueClosureCreatedNotification("closure-1", harness.client as never);

  assert.equal(ids.length, 3);
  assert.deepEqual(
    harness.notifications.map((notification) => notification.recipient),
    ["caretaker-room@example.test", "caretaker-building@example.test", "admin@example.test"],
  );
  assert.equal(harness.notifications[0]?.recipientUserId, null);
  assert.equal(harness.notifications[0]?.eventCode, "CLOSURE_CREATED");
});

test("queues user account and organization status notifications", async () => {
  const harness = createNotificationHarness();

  const userIds = await queueUserAccountNotification(
    "user-requester",
    "USER_ACCOUNT_DEACTIVATED",
    "Die Organisation wurde gesperrt.",
    harness.client as never,
  );
  const organizationIds = await queueOrganizationStatusNotification("org-1", 1, harness.client as never);

  assert.equal(userIds.length, 1);
  assert.equal(organizationIds.length, 1);
  assert.deepEqual(
    harness.notifications.map((notification) => notification.eventCode),
    ["USER_ACCOUNT_DEACTIVATED", "ORGANIZATION_BLOCKED"],
  );
  assert.equal(harness.notifications[0]?.recipient, "requester@example.test");
  assert.equal(harness.notifications[1]?.recipient, "admin@example.test");
});

test("queues and sends an admin test email", async () => {
  const harness = createNotificationHarness();

  const ids = await queueAdminTestEmail(
    {
      recipient: "probe@example.test",
      actorUserId: "user-admin",
      note: "SMTP-Prüfung",
    },
    harness.client as never,
  );

  assert.deepEqual(ids, ["notification-1"]);
  assert.equal(harness.notifications[0]?.eventCode, "ADMIN_TEST_EMAIL");
  const sentPayloads: Array<{ to: string; subject: string }> = [];
  const processed = await processPendingNotifications(1, harness.client as never, {
    sendMail: async (payload) => {
      sentPayloads.push({ to: payload.to, subject: payload.subject });
      return { messageId: "mail-1" };
    },
  });

  assert.equal(processed[0]?.status, "SENT");
  assert.deepEqual(sentPayloads, [{ to: "probe@example.test", subject: "Testmail Hallenverwaltung St. Valentin" }]);
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
