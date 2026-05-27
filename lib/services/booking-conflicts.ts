export type RoomCompositionLink = {
  parentRoomId: string;
  childRoomId: string;
};

export type ConflictingBooking = {
  id: string;
  roomId: string;
  title: string;
  status: "DRAFT" | "REQUESTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED" | "MOVED" | "ARCHIVED";
  blockedFrom: Date;
  blockedUntil: Date;
};

export type ConflictingClosure = {
  id: string;
  buildingId: string | null;
  roomId: string | null;
  reason: string;
  status: "OPEN" | "RESTRICTED" | "CLOSED";
  startsAt: Date;
  endsAt: Date;
};

export type BookingConflict = {
  type: "APPROVED_BOOKING" | "REQUESTED_BOOKING" | "CLOSURE";
  severity: "blocking" | "soft";
  message: string;
};

export function intervalsOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

export function getConflictingRoomIds(roomId: string, links: RoomCompositionLink[]) {
  const roomIds = new Set([roomId]);
  const parentByChild = new Map<string, string>();
  const childrenByParent = new Map<string, string[]>();

  for (const link of links) {
    parentByChild.set(link.childRoomId, link.parentRoomId);
    childrenByParent.set(link.parentRoomId, [...(childrenByParent.get(link.parentRoomId) ?? []), link.childRoomId]);
  }

  let ancestor = parentByChild.get(roomId);
  while (ancestor && !roomIds.has(ancestor)) {
    roomIds.add(ancestor);
    ancestor = parentByChild.get(ancestor);
  }

  const pendingChildren = [...(childrenByParent.get(roomId) ?? [])];
  while (pendingChildren.length) {
    const childId = pendingChildren.pop();
    if (!childId || roomIds.has(childId)) {
      continue;
    }

    roomIds.add(childId);
    pendingChildren.push(...(childrenByParent.get(childId) ?? []));
  }

  return roomIds;
}

export function evaluateBookingConflicts({
  roomId,
  buildingId,
  blockedFrom,
  blockedUntil,
  links,
  bookings,
  closures,
}: {
  roomId: string;
  buildingId: string;
  blockedFrom: Date;
  blockedUntil: Date;
  links: RoomCompositionLink[];
  bookings: ConflictingBooking[];
  closures: ConflictingClosure[];
}) {
  const conflictingRoomIds = getConflictingRoomIds(roomId, links);
  const conflicts: BookingConflict[] = [];

  for (const booking of bookings) {
    if (!["APPROVED", "REQUESTED", "IN_REVIEW"].includes(booking.status)) {
      continue;
    }

    if (
      conflictingRoomIds.has(booking.roomId) &&
      intervalsOverlap(blockedFrom, blockedUntil, booking.blockedFrom, booking.blockedUntil)
    ) {
      const approved = booking.status === "APPROVED";
      conflicts.push({
        type: approved ? "APPROVED_BOOKING" : "REQUESTED_BOOKING",
        severity: approved ? "blocking" : "soft",
        message: approved
          ? `Der Zeitraum kollidiert mit der genehmigten Buchung "${booking.title}".`
          : `Soft-Konflikt: Der Zeitraum ueberschneidet sich mit dem Antrag "${booking.title}".`,
      });
    }
  }

  for (const closure of closures) {
    if (closure.status === "OPEN") {
      continue;
    }

    const affectsRoom =
      closure.buildingId === buildingId || (closure.roomId !== null && conflictingRoomIds.has(closure.roomId));

    if (affectsRoom && intervalsOverlap(blockedFrom, blockedUntil, closure.startsAt, closure.endsAt)) {
      conflicts.push({
        type: "CLOSURE",
        severity: "blocking",
        message: `Der Zeitraum ist durch eine Sperre blockiert: ${closure.reason}.`,
      });
    }
  }

  return conflicts;
}
