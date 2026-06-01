import type { BookingChangeRequestStatus, BookingChangeRequestType } from "@prisma/client";

export const bookingChangeFilterStatuses = [
  "REQUESTED",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const satisfies BookingChangeRequestStatus[];

export type BookingChangeFilterStatus = (typeof bookingChangeFilterStatuses)[number];
export type BookingChangeFilterKey = "OPEN" | "ALL" | BookingChangeFilterStatus;

export function getBookingChangeTypeLabel(type: BookingChangeRequestType) {
  switch (type) {
    case "MOVE":
      return "Verschiebung";
    case "SWAP":
      return "Tausch";
    default:
      return type;
  }
}

export function getBookingChangeStatusLabel(status: BookingChangeRequestStatus) {
  switch (status) {
    case "REQUESTED":
      return "Beantragt";
    case "IN_REVIEW":
      return "In Prüfung";
    case "APPROVED":
      return "Genehmigt";
    case "REJECTED":
      return "Abgelehnt";
    case "CANCELLED":
      return "Storniert";
    default:
      return status;
  }
}

export function getBookingChangeStatusBadgeClass(status: BookingChangeRequestStatus) {
  switch (status) {
    case "REQUESTED":
      return "bg-amber-950/60 text-amber-200 border border-amber-800";
    case "IN_REVIEW":
      return "bg-sky-950/60 text-sky-200 border border-sky-800";
    case "APPROVED":
      return "bg-emerald-950/60 text-emerald-200 border border-emerald-800";
    case "REJECTED":
      return "bg-rose-950/60 text-rose-200 border border-rose-800";
    case "CANCELLED":
    default:
      return "bg-slate-900 text-slate-300 border border-slate-700";
  }
}
