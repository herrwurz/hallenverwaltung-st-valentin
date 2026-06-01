import type { BookingStatus } from "@prisma/client";

export const adminBookingFilterStatuses = [
  "REQUESTED",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const satisfies BookingStatus[];

export type AdminBookingFilterStatus = (typeof adminBookingFilterStatuses)[number];
export type AdminBookingFilterKey = "OPEN" | "ALL" | AdminBookingFilterStatus;

export function getBookingStatusLabel(status: BookingStatus) {
  switch (status) {
    case "DRAFT":
      return "Entwurf";
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
    case "MOVED":
      return "Verschoben";
    case "ARCHIVED":
      return "Archiviert";
    default:
      return status;
  }
}

export function getBookingStatusBadgeClass(status: BookingStatus) {
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
      return "bg-slate-800 text-slate-200 border border-slate-700";
    case "MOVED":
      return "bg-violet-950/60 text-violet-200 border border-violet-800";
    case "ARCHIVED":
    case "DRAFT":
    default:
      return "bg-slate-900 text-slate-300 border border-slate-700";
  }
}
