import { NextResponse } from "next/server";
import pkg from "@/package.json";
import { sendAlert } from "@/lib/alerts";
import { captureException } from "@/lib/sentry";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;
    const version = pkg.version || "0.0.0";

    if (params.get("alert") === "true") {
      try {
        await sendAlert({
          subject: `Healthcheck alert (v${version})`,
          text: `Test alert from /api/health at ${new Date().toISOString()}`,
        });
        return NextResponse.json({ status: "alert_sent" });
      } catch (e) {
        return NextResponse.json({ status: "alert_failed", error: String(e) }, { status: 500 });
      }
    }

    return NextResponse.json({ status: "ok", version, time: new Date().toISOString() });
  } catch (err) {
    captureException(err, { extra: { route: "/api/health" } });
    return NextResponse.json({ status: "error", error: String(err) }, { status: 500 });
  }
}
