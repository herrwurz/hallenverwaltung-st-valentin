import type { WaitlistStatus } from "@prisma/client";

export const adminWaitlistFilterStatuses = [
  "ACTIVE",
  "OFFERED",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "CANCELLED",
] satisfies WaitlistStatus[];

export type AdminWaitlistFilterStatus = (typeof adminWaitlistFilterStatuses)[number];
export type AdminWaitlistFilterKey = AdminWaitlistFilterStatus | "ALL";

export function getWaitlistStatusLabel(status: WaitlistStatus) {
  switch (status) {
    case "ACTIVE":
      return "Aktiv";
    case "OFFERED":
      return "Angeboten";
    case "ACCEPTED":
      return "Angenommen";
    case "DECLINED":
      return "Abgelehnt";
    case "EXPIRED":
      return "Abgelaufen";
    case "CANCELLED":
      return "Storniert";
    default:
      return status;
  }
}

export function getWaitlistStatusBadgeClass(status: WaitlistStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-slate-800 text-slate-100";
    case "OFFERED":
      return "bg-amber-500/20 text-amber-200";
    case "ACCEPTED":
      return "bg-sky-500/20 text-sky-200";
    case "DECLINED":
      return "bg-rose-500/20 text-rose-200";
    case "EXPIRED":
      return "bg-slate-700 text-slate-200";
    case "CANCELLED":
      return "bg-red-500/20 text-red-200";
    default:
      return "bg-slate-800 text-slate-100";
  }
}
