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

export function assertBookingRequestPermission(hasRequestBookingPermission: boolean) {
  if (!hasRequestBookingPermission) {
    throw new BookingValidationError("Sie duerfen keine Buchungen beantragen.");
  }
}

export function assertBookingViewPermission(hasViewBookingPermission: boolean) {
  if (!hasViewBookingPermission) {
    throw new BookingValidationError("Sie duerfen Buchungsantraege nicht einsehen.");
  }
}

export function assertBookingApprovalPermission(hasApprovalPermission: boolean) {
  if (!hasApprovalPermission) {
    throw new BookingValidationError("Sie duerfen Buchungsantraege nicht genehmigen.");
  }
}

export function assertBookingRejectionPermission(hasRejectionPermission: boolean) {
  if (!hasRejectionPermission) {
    throw new BookingValidationError("Sie duerfen Buchungsantraege nicht ablehnen.");
  }
}

export function assertBookingDecisionNote(value: string | undefined | null) {
  if (!value?.trim()) {
    throw new BookingValidationError("Bitte geben Sie eine Begruendung oder einen Kommentar an.");
  }
}

function parseClockTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getLocalDayKey(value: Date) {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function getLocalMinutes(value: Date) {
  return value.getHours() * 60 + value.getMinutes();
}

export function validateBookingAvailability({
  startsAt,
  endsAt,
  blockedFrom,
  blockedUntil,
  openingTime,
  closingTime,
  maximumBookingMinutes,
  singleBookingLeadDays,
  now = new Date(),
}: {
  startsAt: Date;
  endsAt: Date;
  blockedFrom: Date;
  blockedUntil: Date;
  openingTime: string;
  closingTime: string;
  maximumBookingMinutes: number | null;
  singleBookingLeadDays: number;
  now?: Date;
}) {
  if (!(startsAt < endsAt)) {
    throw new BookingValidationError("Der Beginn muss vor dem Ende liegen.");
  }

  if (getLocalDayKey(blockedFrom) !== getLocalDayKey(blockedUntil)) {
    throw new BookingValidationError("Der Zeitraum muss innerhalb eines Kalendertags liegen.");
  }

  const openingMinutes = parseClockTime(openingTime);
  const closingMinutes = parseClockTime(closingTime);
  const blockedFromMinutes = getLocalMinutes(blockedFrom);
  const blockedUntilMinutes = getLocalMinutes(blockedUntil);

  if (blockedFromMinutes < openingMinutes) {
    throw new BookingValidationError("Der Zeitraum liegt vor der Oeffnungszeit des Raums.");
  }

  if (blockedUntilMinutes > closingMinutes) {
    throw new BookingValidationError("Der Zeitraum liegt nach der Schliesszeit des Raums.");
  }

  const bookingDurationMinutes = (endsAt.getTime() - startsAt.getTime()) / 60_000;
  if (maximumBookingMinutes !== null && bookingDurationMinutes > maximumBookingMinutes) {
    throw new BookingValidationError("Die maximale Buchungsdauer des Raums wurde ueberschritten.");
  }

  const latestAllowedStart = new Date(now.getTime() + singleBookingLeadDays * 24 * 60 * 60 * 1000);
  if (startsAt > latestAllowedStart) {
    throw new BookingValidationError("Der Termin liegt ausserhalb des zulassigen Buchungsvorlaufs.");
  }
}
