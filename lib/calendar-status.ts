import type { BookingStatus } from "@prisma/client";

export type CalendarEventStatus = Extract<
  BookingStatus,
  "REQUESTED" | "IN_REVIEW" | "APPROVED" | "CANCELLED"
> | "CLOSURE";

export function getCalendarEventStatusLabel(status: CalendarEventStatus) {
  switch (status) {
    case "REQUESTED":
      return "Beantragt";
    case "IN_REVIEW":
      return "In Prüfung";
    case "APPROVED":
      return "Genehmigt";
    case "CANCELLED":
      return "Storniert";
    case "CLOSURE":
      return "Gesperrt";
    default:
      return status;
  }
}

export function getCalendarEventStatusBadgeClass(status: CalendarEventStatus) {
  switch (status) {
    case "REQUESTED":
      return "bg-amber-500/20 text-amber-200";
    case "IN_REVIEW":
      return "bg-sky-500/20 text-sky-200";
    case "APPROVED":
      return "bg-emerald-500/20 text-emerald-200";
    case "CANCELLED":
      return "bg-slate-700 text-slate-200";
    case "CLOSURE":
      return "bg-rose-500/20 text-rose-200";
    default:
      return "bg-slate-800 text-slate-100";
  }
}
