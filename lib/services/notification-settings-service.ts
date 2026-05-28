import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notificationEventCodes, type NotificationEventCode } from "@/lib/services/notification-types";

export const notificationEventSettingsKey = "notifications.events.enabled";

export const notificationEventLabels: Record<NotificationEventCode, string> = {
  BOOKING_REQUESTED: "Buchung beantragt",
  BOOKING_IN_REVIEW: "Buchung in Pruefung",
  BOOKING_APPROVED: "Buchung genehmigt",
  BOOKING_REJECTED: "Buchung abgelehnt",
  BOOKING_CANCELLED: "Buchung storniert",
  WAITLIST_OFFER_CREATED: "Wartelistenangebot",
  WAITLIST_OFFER_EXPIRED: "Wartelistenangebot abgelaufen",
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
