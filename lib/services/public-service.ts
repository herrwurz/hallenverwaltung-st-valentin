import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPublicCalendarVisibilityMode } from "@/lib/services/calendar-settings-service";
import { getPublicCalendarEvents } from "@/lib/services/calendar-service";

type PublicServiceClient = Pick<PrismaClient, "building" | "room" | "booking" | "closure" | "roomComposition" | "organizationMember" | "systemSetting">;

export type PublicOverview = {
  buildingCount: number;
  roomCount: number;
  nextEventCount: number;
  nextClosureCount: number;
  visibilityMode: "occupied_only" | "organization" | "event";
  buildings: Array<{
    id: string;
    name: string;
    roomCount: number;
  }>;
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getPublicOverview(client: PublicServiceClient = prisma): Promise<PublicOverview> {
  const today = new Date();
  const inTwoWeeks = new Date(today);
  inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);

  const [buildings, activeRoomCount, visibilityMode, calendar] = await Promise.all([
    client.building.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        rooms: {
          where: { status: { in: ["ACTIVE", "RESTRICTED"] } },
          select: { id: true },
        },
      },
    }),
    client.room.count({
      where: {
        status: { in: ["ACTIVE", "RESTRICTED"] },
        building: { isActive: true },
      },
    }),
    getPublicCalendarVisibilityMode(client),
    getPublicCalendarEvents({ date: toDateKey(today), view: "week" }, client),
  ]);

  return {
    buildingCount: buildings.length,
    roomCount: activeRoomCount,
    nextEventCount: calendar.events.filter((event) => event.sourceType === "booking" && event.startsAt <= inTwoWeeks).length,
    nextClosureCount: calendar.events.filter((event) => event.sourceType === "closure" && event.startsAt <= inTwoWeeks).length,
    visibilityMode,
    buildings: buildings.map((building) => ({
      id: building.id,
      name: building.name,
      roomCount: building.rooms.length,
    })),
  };
}
