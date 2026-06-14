import { getPublicCalendarEvents, type CalendarQuery } from "@/lib/services/calendar-service";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PublicCalendarExportClient = Pick<
  PrismaClient,
  "building" | "room" | "roomComposition" | "booking" | "closure" | "organization" | "organizationMember" | "systemSetting"
>;

function escapeIcsText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

function formatIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function foldIcsLine(line: string) {
  const chunks: string[] = [];
  let remaining = line;

  while (remaining.length > 75) {
    chunks.push(remaining.slice(0, 75));
    remaining = ` ${remaining.slice(75)}`;
  }

  chunks.push(remaining);
  return chunks.join("\r\n");
}

export async function exportPublicCalendarIcs(
  query: CalendarQuery,
  client: PublicCalendarExportClient = prisma,
) {
  const calendar = await getPublicCalendarEvents(query, client);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hallenverwaltung St. Valentin//Public Calendar//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of calendar.events) {
    const location = [event.buildingName, event.roomName].filter(Boolean).join(" - ");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.sourceType}-${event.id}@hallenverwaltung-st-valentin`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(event.startsAt)}`,
      `DTEND:${formatIcsDate(event.endsAt)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText(event.subtitle ?? "Öffentliche Hallenbelegung")}`,
      `LOCATION:${escapeIcsText(location)}`,
      `STATUS:${event.status === "CLOSURE" ? "CONFIRMED" : "BUSY"}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
