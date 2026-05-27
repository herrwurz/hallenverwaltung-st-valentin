import type { BookingConflict } from "@/lib/services/booking-conflicts";

export class BookingValidationError extends Error {
  conflicts?: BookingConflict[];

  constructor(message: string, conflicts?: BookingConflict[]) {
    super(message);
    this.name = "BookingValidationError";
    this.conflicts = conflicts;
  }
}

export function assertOrganizationBookingAccess({
  isAdmin,
  hasActiveMembership,
}: {
  isAdmin: boolean;
  hasActiveMembership: boolean;
}) {
  if (!isAdmin && !hasActiveMembership) {
    throw new BookingValidationError("Sie duerfen fuer diese Organisation keine Buchung beantragen.");
  }
}

export function buildRequestHistoryData(actorUserId: string, startsAt: Date, endsAt: Date) {
  return {
    actorUserId,
    oldStatus: "REQUESTED" as const,
    newStatus: "REQUESTED" as const,
    reason: "Buchungsantrag erstellt.",
    newStartAt: startsAt,
    newEndAt: endsAt,
  };
}
