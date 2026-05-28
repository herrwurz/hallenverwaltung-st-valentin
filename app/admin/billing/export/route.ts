import type { BillingStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/permissions";
import {
  exportBillingCsv,
  exportBillingPdf,
  exportBillingXlsx,
  type BillingPdfReportType,
} from "@/lib/services/export-service";

const billingStatuses: BillingStatus[] = ["NOT_RELEVANT", "OPEN", "EXPORTED", "BILLED", "CANCELLED"];

function parseDate(value: string | null, fallback: Date) {
  if (!value) {
    return fallback;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseStatus(value: string | null) {
  return billingStatuses.find((status) => status === value);
}

function parseReportType(value: string | null): BillingPdfReportType {
  return value === "organization" || value === "roomUsage" ? value : "monthly";
}

export async function GET(request: NextRequest) {
  const user = await requirePermission("BILLING_EXPORT");
  const params = request.nextUrl.searchParams;
  const now = new Date();
  const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const periodStart = parseDate(params.get("periodStart"), defaultStart);
  const periodEnd = addDays(parseDate(params.get("periodEnd"), defaultEnd), 1);
  const format = params.get("format") ?? "csv";
  const input = {
    periodStart,
    periodEnd,
    actorUserId: user.id,
    organizationId: params.get("organizationId") || undefined,
    buildingId: params.get("buildingId") || undefined,
    roomId: params.get("roomId") || undefined,
    status: parseStatus(params.get("status")),
    markExported: params.get("markExported") === "1",
    reportType: parseReportType(params.get("report")),
  };

  const result =
    format === "xlsx"
      ? await exportBillingXlsx(input, undefined, { canExport: true })
      : format === "pdf"
        ? await exportBillingPdf(input, undefined, { canExport: true })
        : await exportBillingCsv(input, undefined, { canExport: true });

  return new Response(new Uint8Array(result.content), {
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.fileName}"`,
      "X-Billing-Exported-Count": String(result.exportedCount),
    },
  });
}
