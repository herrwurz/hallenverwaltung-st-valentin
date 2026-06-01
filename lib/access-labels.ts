import type { AccessMediumType } from "@prisma/client";

const accessMediumTypeLabels: Record<AccessMediumType, string> = {
  KEY: "Schluessel",
  RFID_CARD: "RFID-Karte",
  ELECTRONIC_ACCESS: "Elektronischer Zutritt",
};

export function getAccessMediumTypeLabel(type: AccessMediumType) {
  return accessMediumTypeLabels[type];
}
