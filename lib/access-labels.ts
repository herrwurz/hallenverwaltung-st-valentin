import type { AccessMediumType } from "@prisma/client";

const accessMediumTypeLabels: Record<AccessMediumType, string> = {
  KEY: "Schlüssel",
  RFID_CARD: "RFID-Karte",
  ELECTRONIC_ACCESS: "Elektronischer Zutritt",
};

export function getAccessMediumTypeLabel(type: AccessMediumType) {
  return accessMediumTypeLabels[type];
}
