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
      return "border border-warning/35 bg-warning/15 text-warning-foreground";
    case "IN_REVIEW":
      return "border border-primary/20 bg-primary/10 text-primary";
    case "APPROVED":
      return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
    case "CANCELLED":
      return "border border-slate-500/20 bg-slate-500/10 text-slate-700";
    case "CLOSURE":
      return "border border-rose-500/20 bg-rose-500/10 text-rose-700";
    default:
      return "border border-slate-500/20 bg-slate-500/10 text-slate-700";
  }
}
