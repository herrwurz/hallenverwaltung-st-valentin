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
  "BOOKING_CHANGE_REQUESTED",
  "BOOKING_CHANGE_IN_REVIEW",
  "BOOKING_CHANGE_APPROVED",
  "BOOKING_CHANGE_REJECTED",
  "WAITLIST_OFFER_CREATED",
  "WAITLIST_OFFER_EXPIRED",
  "CLOSURE_CREATED",
  "USER_ACCOUNT_CREATED",
  "USER_ACCOUNT_DEACTIVATED",
  "ORGANIZATION_BLOCKED",
  "DAMAGE_REPORTED",
  "NO_SHOW_REPORTED",
  "ADMIN_TEST_EMAIL",
] as const;

export type NotificationEventCode = (typeof notificationEventCodes)[number];

const isoDateString = z.string().datetime();

export const bookingNotificationPayloadSchema = z.object({
  bookingId: z.string().min(1),
  title: z.string().min(1),
  organizationName: z.string().min(1),
  buildingName: z.string().min(1),
  roomName: z.string().min(1),
  usageTypeName: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
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

export const bookingChangeNotificationPayloadSchema = z.object({
  changeRequestId: z.string().min(1),
  bookingId: z.string().min(1),
  title: z.string().min(1),
  organizationName: z.string().min(1),
  oldBuildingName: z.string().min(1),
  oldRoomName: z.string().min(1),
  newBuildingName: z.string().min(1),
  newRoomName: z.string().min(1),
  oldStartAt: isoDateString,
  oldEndAt: isoDateString,
  newStartAt: isoDateString,
  newEndAt: isoDateString,
  requestedByName: z.string().min(1).optional(),
  processedByName: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
});

export type BookingChangeNotificationPayload = z.infer<typeof bookingChangeNotificationPayloadSchema>;

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

const affectedBookingItemSchema = z.object({
  bookingId: z.string().min(1),
  title: z.string().min(1),
  organizationName: z.string().min(1),
  buildingName: z.string().min(1),
  roomName: z.string().min(1),
  usageTypeName: z.string().min(1),
  status: z.string().min(1),
  startsAt: isoDateString,
  endsAt: isoDateString,
});

export type AffectedBookingItem = z.infer<typeof affectedBookingItemSchema>;

export const closureNotificationPayloadSchema = z.object({
  closureId: z.string().min(1),
  targetName: z.string().min(1),
  targetType: z.enum(["BUILDING", "ROOM"]),
  status: z.string().min(1),
  reason: z.string().min(1),
  startsAt: isoDateString,
  endsAt: isoDateString,
  isPublic: z.boolean(),
  affectedBookings: z.array(affectedBookingItemSchema).optional(),
});

export type ClosureNotificationPayload = z.infer<typeof closureNotificationPayloadSchema>;

export const userAccountNotificationPayloadSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1),
  email: z.email(),
  note: z.string().min(1).optional(),
});

export type UserAccountNotificationPayload = z.infer<typeof userAccountNotificationPayloadSchema>;

export const organizationNotificationPayloadSchema = z.object({
  organizationId: z.string().min(1),
  organizationName: z.string().min(1),
  status: z.string().min(1),
  reason: z.string().min(1).optional(),
  affectedUserCount: z.number().int().nonnegative().optional(),
});

export type OrganizationNotificationPayload = z.infer<typeof organizationNotificationPayloadSchema>;

export const adminTestNotificationPayloadSchema = z.object({
  recipient: z.email(),
  requestedByName: z.string().min(1).optional(),
  createdAt: isoDateString,
  note: z.string().min(1).optional(),
});

export type AdminTestNotificationPayload = z.infer<typeof adminTestNotificationPayloadSchema>;

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
      eventCode:
        | "BOOKING_CHANGE_REQUESTED"
        | "BOOKING_CHANGE_IN_REVIEW"
        | "BOOKING_CHANGE_APPROVED"
        | "BOOKING_CHANGE_REJECTED";
      payload: BookingChangeNotificationPayload;
    }
  | {
      eventCode: "WAITLIST_OFFER_CREATED" | "WAITLIST_OFFER_EXPIRED";
      payload: WaitlistNotificationPayload;
    }
  | {
      eventCode: "CLOSURE_CREATED";
      payload: ClosureNotificationPayload;
    }
  | {
      eventCode: "USER_ACCOUNT_CREATED" | "USER_ACCOUNT_DEACTIVATED";
      payload: UserAccountNotificationPayload;
    }
  | {
      eventCode: "ORGANIZATION_BLOCKED";
      payload: OrganizationNotificationPayload;
    }
  | {
      eventCode: "DAMAGE_REPORTED";
      payload: DamageNotificationPayload;
    }
  | {
      eventCode: "NO_SHOW_REPORTED";
      payload: NoShowNotificationPayload;
    }
  | {
      eventCode: "ADMIN_TEST_EMAIL";
      payload: AdminTestNotificationPayload;
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
    case "BOOKING_CHANGE_REQUESTED":
    case "BOOKING_CHANGE_IN_REVIEW":
    case "BOOKING_CHANGE_APPROVED":
    case "BOOKING_CHANGE_REJECTED":
      return {
        eventCode,
        payload: bookingChangeNotificationPayloadSchema.parse(payload),
      };
    case "WAITLIST_OFFER_CREATED":
    case "WAITLIST_OFFER_EXPIRED":
      return {
        eventCode,
        payload: waitlistNotificationPayloadSchema.parse(payload),
      };
    case "CLOSURE_CREATED":
      return {
        eventCode,
        payload: closureNotificationPayloadSchema.parse(payload),
      };
    case "USER_ACCOUNT_CREATED":
    case "USER_ACCOUNT_DEACTIVATED":
      return {
        eventCode,
        payload: userAccountNotificationPayloadSchema.parse(payload),
      };
    case "ORGANIZATION_BLOCKED":
      return {
        eventCode,
        payload: organizationNotificationPayloadSchema.parse(payload),
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
    case "ADMIN_TEST_EMAIL":
      return {
        eventCode,
        payload: adminTestNotificationPayloadSchema.parse(payload),
      };
    default:
      throw new Error(`Unsupported notification event code: ${eventCode}`);
  }
}
