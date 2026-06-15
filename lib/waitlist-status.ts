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
      return "Beantragt";
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
      return "border border-amber-500/20 bg-amber-500/10 text-amber-700";
    case "OFFERED":
      return "border border-primary/20 bg-primary/10 text-primary";
    case "ACCEPTED":
      return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
    case "DECLINED":
      return "border border-rose-500/20 bg-rose-500/10 text-rose-700";
    case "EXPIRED":
      return "border border-slate-500/20 bg-slate-500/10 text-slate-700";
    case "CANCELLED":
      return "border border-slate-500/20 bg-slate-500/10 text-slate-700";
    default:
      return "border border-slate-500/20 bg-slate-500/10 text-slate-700";
  }
}
