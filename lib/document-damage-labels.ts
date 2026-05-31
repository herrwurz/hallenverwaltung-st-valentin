import type { DamageStatus, DocumentType } from "@prisma/client";

export function getDocumentTypeLabel(type: DocumentType) {
  switch (type) {
    case "HOUSE_RULES":
      return "Hallenordnung";
    case "USAGE_CONTRACT":
      return "Benuetzungsvertrag";
    case "INSURANCE_CERTIFICATE":
      return "Versicherungsnachweis";
    case "EVENT_PERMIT":
      return "Veranstaltungsgenehmigung";
    case "OTHER":
    default:
      return "Sonstiges Dokument";
  }
}

export function getDamageStatusLabel(status: DamageStatus) {
  switch (status) {
    case "REPORTED":
      return "Gemeldet";
    case "IN_REVIEW":
      return "In Bearbeitung";
    case "RESOLVED":
      return "Erledigt";
    default:
      return status;
  }
}

export function getDamageStatusBadgeClass(status: DamageStatus) {
  switch (status) {
    case "REPORTED":
      return "bg-amber-950/60 text-amber-200 border border-amber-800";
    case "IN_REVIEW":
      return "bg-sky-950/60 text-sky-200 border border-sky-800";
    case "RESOLVED":
    default:
      return "bg-emerald-950/60 text-emerald-200 border border-emerald-800";
  }
}
