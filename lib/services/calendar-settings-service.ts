import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { getPublicAreaDefaultEnabled } from "@/lib/config/environment";
import { prisma } from "@/lib/prisma";

export const publicCalendarVisibilityModes = ["occupied_only", "organization", "event"] as const;
export type PublicCalendarVisibilityMode = (typeof publicCalendarVisibilityModes)[number];

export const publicAreaEnabledSettingKey = "public.area.enabled";
export const publicCalendarVisibilitySettingKey = "public.calendar.visibility.default";

export const publicAreaEnabledSettingSchema = z.object({
  enabled: z.boolean(),
});

export const publicCalendarVisibilitySettingSchema = z.object({
  mode: z.enum(publicCalendarVisibilityModes),
});

type CalendarSettingsClient = Pick<PrismaClient, "systemSetting">;

export function parsePublicAreaEnabledSetting(value: unknown, defaultEnabled = getPublicAreaDefaultEnabled()): boolean {
  const parsed = publicAreaEnabledSettingSchema.safeParse(value);
  return parsed.success ? parsed.data.enabled : defaultEnabled;
}

export function parsePublicCalendarVisibilitySetting(
  value: unknown,
): PublicCalendarVisibilityMode {
  const parsed = publicCalendarVisibilitySettingSchema.safeParse(value);
  return parsed.success ? parsed.data.mode : "occupied_only";
}

export async function getPublicAreaEnabled(client: CalendarSettingsClient = prisma): Promise<boolean> {
  const setting = await client.systemSetting.findUnique({
    where: { key: publicAreaEnabledSettingKey },
    select: { value: true },
  });

  return parsePublicAreaEnabledSetting(setting?.value);
}

export async function getPublicCalendarVisibilityMode(
  client: CalendarSettingsClient = prisma,
): Promise<PublicCalendarVisibilityMode> {
  const setting = await client.systemSetting.findUnique({
    where: { key: publicCalendarVisibilitySettingKey },
    select: { value: true },
  });

  return parsePublicCalendarVisibilitySetting(setting?.value);
}

export async function updatePublicAreaEnabled(input: unknown, client: CalendarSettingsClient = prisma) {
  const parsed = publicAreaEnabledSettingSchema.parse(input);

  return client.systemSetting.upsert({
    where: { key: publicAreaEnabledSettingKey },
    update: {
      value: parsed,
    },
    create: {
      key: publicAreaEnabledSettingKey,
      value: parsed,
    },
  });
}

export async function updatePublicCalendarVisibilityMode(
  input: unknown,
  client: CalendarSettingsClient = prisma,
) {
  const parsed = publicCalendarVisibilitySettingSchema.parse(input);

  return client.systemSetting.upsert({
    where: { key: publicCalendarVisibilitySettingKey },
    update: {
      value: parsed,
    },
    create: {
      key: publicCalendarVisibilitySettingKey,
      value: parsed,
    },
  });
}
