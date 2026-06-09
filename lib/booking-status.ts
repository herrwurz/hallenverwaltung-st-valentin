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
      return "bg-warning/15 text-warning-foreground border border-warning/35";
    case "IN_REVIEW":
      return "bg-primary/10 text-primary border border-primary/20";
    case "APPROVED":
      return "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20";
    case "REJECTED":
      return "bg-rose-500/10 text-rose-700 border border-rose-500/20";
    case "CANCELLED":
      return "bg-slate-500/10 text-slate-700 border border-slate-500/20";
    case "MOVED":
      return "bg-violet-500/10 text-violet-700 border border-violet-500/20";
    case "ARCHIVED":
    case "DRAFT":
    default:
      return "bg-slate-500/10 text-slate-700 border border-slate-500/20";
  }
}
