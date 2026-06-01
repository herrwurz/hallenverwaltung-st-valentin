import type { NoShowStatus } from "@prisma/client";

export function getNoShowStatusLabel(status: NoShowStatus) {
  switch (status) {
    case "REPORTED":
      return "Gemeldet";
    case "ACKNOWLEDGED":
      return "Zur Kenntnis genommen";
    default:
      return status;
  }
}

export function getNoShowStatusBadgeClass(status: NoShowStatus) {
  switch (status) {
    case "REPORTED":
      return "bg-amber-900/70 text-amber-100";
    case "ACKNOWLEDGED":
      return "bg-emerald-900/70 text-emerald-100";
    default:
      return "bg-slate-800 text-slate-200";
  }
}
