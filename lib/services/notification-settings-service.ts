import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notificationEventCodes, type NotificationEventCode } from "@/lib/services/notification-types";

export const notificationEventSettingsKey = "notifications.events.enabled";

export const notificationEventLabels: Record<NotificationEventCode, string> = {
  BOOKING_REQUESTED: "Buchung beantragt",
  BOOKING_IN_REVIEW: "Buchung in Prüfung",
  BOOKING_APPROVED: "Buchung genehmigt",
  BOOKING_REJECTED: "Buchung abgelehnt",
  BOOKING_CANCELLED: "Buchung storniert",
  BOOKING_SERIES_REQUESTED: "Serienbuchung beantragt",
  BOOKING_SERIES_IN_REVIEW: "Serienbuchung in Prüfung",
  BOOKING_SERIES_APPROVED: "Serienbuchung genehmigt",
  BOOKING_SERIES_REJECTED: "Serienbuchung abgelehnt",
  BOOKING_CHANGE_REQUESTED: "Verschiebung beantragt",
  BOOKING_CHANGE_IN_REVIEW: "Verschiebung in Prüfung",
  BOOKING_CHANGE_APPROVED: "Verschiebung genehmigt",
  BOOKING_CHANGE_REJECTED: "Verschiebung abgelehnt",
  WAITLIST_OFFER_CREATED: "Wartelistenangebot",
  WAITLIST_OFFER_EXPIRED: "Wartelistenangebot abgelaufen",
  CLOSURE_CREATED: "Sperre angelegt",
  USER_ACCOUNT_CREATED: "Benutzerkonto angelegt",
  USER_ACCOUNT_DEACTIVATED: "Benutzerkonto deaktiviert",
  ORGANIZATION_BLOCKED: "Organisation gesperrt/stillgelegt",
  DAMAGE_REPORTED: "Schaden gemeldet",
  NO_SHOW_REPORTED: "No-Show gemeldet",
  ADMIN_TEST_EMAIL: "Testmail",
};

export const notificationEventSettingsSchema = z.object(
  Object.fromEntries(notificationEventCodes.map((eventCode) => [eventCode, z.boolean()])) as Record<
    NotificationEventCode,
    z.ZodBoolean
  >,
);

export type NotificationEventSettings = z.infer<typeof notificationEventSettingsSchema>;

type NotificationSettingsClient = Pick<PrismaClient, "systemSetting">;

export function getDefaultNotificationEventSettings(): NotificationEventSettings {
  return Object.fromEntries(notificationEventCodes.map((eventCode) => [eventCode, true])) as NotificationEventSettings;
}

export function parseNotificationEventSettings(value: unknown): NotificationEventSettings {
  const defaults = getDefaultNotificationEventSettings();
  const parsed = z.partialRecord(z.enum(notificationEventCodes), z.boolean()).safeParse(value);

  if (!parsed.success) {
    return defaults;
  }

  return {
    ...defaults,
    ...parsed.data,
  };
}

export async function getNotificationEventSettings(
  client: NotificationSettingsClient = prisma,
): Promise<NotificationEventSettings> {
  const setting = await client.systemSetting.findUnique({
    where: { key: notificationEventSettingsKey },
    select: { value: true },
  });

  return parseNotificationEventSettings(setting?.value);
}

export async function isNotificationEventEnabled(
  eventCode: NotificationEventCode,
  client: NotificationSettingsClient = prisma,
) {
  const settings = await getNotificationEventSettings(client);
  return settings[eventCode];
}

export async function updateNotificationEventSettings(
  input: unknown,
  client: NotificationSettingsClient = prisma,
) {
  const parsed = notificationEventSettingsSchema.parse(input);

  return client.systemSetting.upsert({
    where: { key: notificationEventSettingsKey },
    update: {
      value: parsed,
    },
    create: {
      key: notificationEventSettingsKey,
      value: parsed,
    },
  });
}
