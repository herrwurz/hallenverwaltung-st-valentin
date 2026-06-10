import { z } from "zod";

export const notificationEventCodes = [
  "BOOKING_REQUESTED",
  "BOOKING_IN_REVIEW",
  "BOOKING_APPROVED",
  "BOOKING_REJECTED",
  "BOOKING_CANCELLED",
  "BOOKING_SERIES_REQUESTED",
  "BOOKING_SERIES_IN_REVIEW",
  "BOOKING_SERIES_APPROVED",
  "BOOKING_SERIES_REJECTED",
  "WAITLIST_OFFER_CREATED",
  "WAITLIST_OFFER_EXPIRED",
  "DAMAGE_REPORTED",
  "NO_SHOW_REPORTED",
] as const;

export type NotificationEventCode = (typeof notificationEventCodes)[number];

const isoDateString = z.string().datetime();

export const bookingNotificationPayloadSchema = z.object({
  bookingId: z.string().min(1),
  title: z.string().min(1),
  organizationName: z.string().min(1),
  buildingName: z.string().min(1),
  roomName: z.string().min(1),
  startsAt: isoDateString,
  endsAt: isoDateString,
  requestedByName: z.string().min(1).optional(),
  processedByName: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
});

export type BookingNotificationPayload = z.infer<typeof bookingNotificationPayloadSchema>;

export const bookingSeriesNotificationPayloadSchema = z.object({
  seriesId: z.string().min(1),
  title: z.string().min(1),
  organizationName: z.string().min(1),
  buildingName: z.string().min(1),
  roomName: z.string().min(1),
  startsAt: isoDateString,
  endsAt: isoDateString,
  createdCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative().default(0),
  processedCount: z.number().int().nonnegative().optional(),
  failedCount: z.number().int().nonnegative().optional(),
  requestedByName: z.string().min(1).optional(),
  processedByName: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
});

export type BookingSeriesNotificationPayload = z.infer<typeof bookingSeriesNotificationPayloadSchema>;

export const waitlistNotificationPayloadSchema = z.object({
  waitlistEntryId: z.string().min(1),
  title: z.string().min(1),
  organizationName: z.string().min(1),
  buildingName: z.string().min(1),
  roomName: z.string().min(1),
  startsAt: isoDateString,
  endsAt: isoDateString,
  offerExpiresAt: isoDateString,
});

export type WaitlistNotificationPayload = z.infer<typeof waitlistNotificationPayloadSchema>;

export const damageNotificationPayloadSchema = z.object({
  damageReportId: z.string().min(1),
  buildingName: z.string().min(1),
  roomName: z.string().min(1),
  reportedByName: z.string().min(1).optional(),
  description: z.string().min(1),
  reportedAt: isoDateString,
});

export type DamageNotificationPayload = z.infer<typeof damageNotificationPayloadSchema>;

export const noShowNotificationPayloadSchema = z.object({
  noShowReportId: z.string().min(1),
  bookingId: z.string().min(1),
  title: z.string().min(1),
  organizationName: z.string().min(1),
  buildingName: z.string().min(1),
  roomName: z.string().min(1),
  startsAt: isoDateString,
  endsAt: isoDateString,
  reportedByName: z.string().min(1).optional(),
  description: z.string().min(1),
  reportedAt: isoDateString,
});

export type NoShowNotificationPayload = z.infer<typeof noShowNotificationPayloadSchema>;

export type NotificationTemplateData =
  | {
      eventCode:
        | "BOOKING_REQUESTED"
        | "BOOKING_IN_REVIEW"
        | "BOOKING_APPROVED"
        | "BOOKING_REJECTED"
        | "BOOKING_CANCELLED";
      payload: BookingNotificationPayload;
    }
  | {
      eventCode:
        | "BOOKING_SERIES_REQUESTED"
        | "BOOKING_SERIES_IN_REVIEW"
        | "BOOKING_SERIES_APPROVED"
        | "BOOKING_SERIES_REJECTED";
      payload: BookingSeriesNotificationPayload;
    }
  | {
      eventCode: "WAITLIST_OFFER_CREATED" | "WAITLIST_OFFER_EXPIRED";
      payload: WaitlistNotificationPayload;
    }
  | {
      eventCode: "DAMAGE_REPORTED";
      payload: DamageNotificationPayload;
    }
  | {
      eventCode: "NO_SHOW_REPORTED";
      payload: NoShowNotificationPayload;
    };

export function parseNotificationTemplateData(
  eventCode: string,
  payload: unknown,
): NotificationTemplateData {
  switch (eventCode) {
    case "BOOKING_REQUESTED":
    case "BOOKING_IN_REVIEW":
    case "BOOKING_APPROVED":
    case "BOOKING_REJECTED":
    case "BOOKING_CANCELLED":
      return {
        eventCode,
        payload: bookingNotificationPayloadSchema.parse(payload),
      };
    case "BOOKING_SERIES_REQUESTED":
    case "BOOKING_SERIES_IN_REVIEW":
    case "BOOKING_SERIES_APPROVED":
    case "BOOKING_SERIES_REJECTED":
      return {
        eventCode,
        payload: bookingSeriesNotificationPayloadSchema.parse(payload),
      };
    case "WAITLIST_OFFER_CREATED":
    case "WAITLIST_OFFER_EXPIRED":
      return {
        eventCode,
        payload: waitlistNotificationPayloadSchema.parse(payload),
      };
    case "DAMAGE_REPORTED":
      return {
        eventCode,
        payload: damageNotificationPayloadSchema.parse(payload),
      };
    case "NO_SHOW_REPORTED":
      return {
        eventCode,
        payload: noShowNotificationPayloadSchema.parse(payload),
      };
    default:
      throw new Error(`Unsupported notification event code: ${eventCode}`);
  }
}
