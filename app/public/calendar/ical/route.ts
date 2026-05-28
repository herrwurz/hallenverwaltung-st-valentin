import { NextRequest } from "next/server";
import { exportPublicCalendarIcs } from "@/lib/services/public-calendar-export-service";
import type { CalendarView } from "@/lib/services/calendar-service";

function parseView(value: string | null): CalendarView {
  return value === "week" ? "week" : "day";
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const content = await exportPublicCalendarIcs({
    date: params.get("date") ?? undefined,
    view: parseView(params.get("view")),
    buildingId: params.get("buildingId") || undefined,
    roomId: params.get("roomId") || undefined,
  });

  return new Response(content, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"hallenverwaltung-st-valentin.ics\"",
      "Cache-Control": "public, max-age=300",
    },
  });
}
