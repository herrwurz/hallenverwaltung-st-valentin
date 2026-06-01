import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { markOpenBillingEntriesExported } from "@/lib/services/billing-transition-service";
import {
  getBillingReportData,
  type BillingReportFilter,
  type BillingReportRow,
} from "@/lib/services/reporting-service";

type ExportFormat = "csv" | "xlsx" | "pdf";
export type BillingPdfReportType = "monthly" | "organization" | "roomUsage";

type ExportClient = typeof prisma;

export type BillingExportInput = BillingReportFilter & {
  actorUserId: string;
  markExported?: boolean;
  reportType?: BillingPdfReportType;
};

export type ExportPermissions = {
  canExport?: boolean;
};

export type ExportResult = {
  content: Buffer;
  contentType: string;
  fileName: string;
  exportedCount: number;
};

const csvContentType = "text/csv; charset=utf-8";
const xlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const pdfContentType = "application/pdf";

async function assertBillingExportPermission(actorUserId: string, permissions: ExportPermissions = {}) {
  const canExport =
    typeof permissions.canExport === "boolean"
      ? permissions.canExport
      : await hasPermission(actorUserId, "BILLING_EXPORT");

  if (!canExport) {
    throw new Error("Sie dürfen Abrechnungsexporte nicht erstellen.");
  }
}

function formatDateTime(date: Date) {
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function money(value: string) {
  return Number(value).toFixed(2);
}

function buildFileName(prefix: string, format: ExportFormat, input: BillingReportFilter) {
  return `${prefix}_${formatDate(input.periodStart)}_${formatDate(input.periodEnd)}.${format}`;
}

function csvEscape(value: string | number | null) {
  const raw = String(value ?? "");
  return /[",\r\n;]/.test(raw) ? `"${raw.replaceAll("\"", "\"\"")}"` : raw;
}

function toCsv(rows: BillingReportRow[]) {
  const header = [
    "Organisation",
    "Gebäude",
    "Raum",
    "Datum",
    "Zeit",
    "Nutzungstyp",
    "Buchung",
    "Tarif",
    "Betrag",
    "Status",
    "Exportdatum",
  ];
  const lines = rows.map((row) => [
    row.organizationName,
    row.buildingName,
    row.roomName,
    formatDate(row.startsAt),
    `${formatDateTime(row.startsAt).slice(11)}-${formatDateTime(row.endsAt).slice(11)}`,
    row.usageTypeName,
    row.bookingTitle,
    row.tariffName,
    money(row.amount),
    row.status,
    row.exportedAt ? formatDateTime(row.exportedAt) : "",
  ]);

  return Buffer.from(`\uFEFF${[header, ...lines].map((line) => line.map(csvEscape).join(";")).join("\r\n")}\r\n`, "utf8");
}

function escapeXml(value: string | number | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index: number) {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    const modulo = (value - 1) % 26;
    name = String.fromCharCode(65 + modulo) + name;
    value = Math.floor((value - modulo) / 26);
  }
  return name;
}

function xlsxCell(value: string | number, rowIndex: number, columnIndex: number) {
  const ref = `${columnName(columnIndex)}${rowIndex}`;
  if (typeof value === "number") {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }

  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function worksheetXml(rows: Array<Array<string | number>>) {
  const sheetData = rows
    .map((row, rowIndex) => {
      const excelRow = rowIndex + 1;
      return `<row r="${excelRow}">${row.map((cell, columnIndex) => xlsxCell(cell, excelRow, columnIndex)).join("")}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetData}</sheetData></worksheet>`;
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
}

function buildZip(files: Array<{ name: string; content: string }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const { time, date } = zipDateTime();

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const content = Buffer.from(file.content, "utf8");
    const crc = crc32(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, content);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function toXlsx(rows: BillingReportRow[]) {
  const sheetRows: Array<Array<string | number>> = [
    ["Organisation", "Gebäude", "Raum", "Datum", "Zeit", "Nutzungstyp", "Buchung", "Tarif", "Betrag", "Status", "Exportdatum"],
    ...rows.map((row) => [
      row.organizationName,
      row.buildingName,
      row.roomName,
      formatDate(row.startsAt),
      `${formatDateTime(row.startsAt).slice(11)}-${formatDateTime(row.endsAt).slice(11)}`,
      row.usageTypeName,
      row.bookingTitle,
      row.tariffName,
      Number(money(row.amount)),
      row.status,
      row.exportedAt ? formatDateTime(row.exportedAt) : "",
    ]),
  ];

  return buildZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Abrechnung" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: worksheetXml(sheetRows),
    },
  ]);
}

function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function toPdfLines(title: string, sourceLines: string[]) {
  const renderedLines = [
    title,
    `Erstellt: ${formatDateTime(new Date())}`,
    "",
    ...sourceLines,
  ].slice(0, 48);
  const text = renderedLines.map((line, index) => `BT /F1 10 Tf 50 ${790 - index * 15} Td (${escapePdfText(line)}) Tj ET`).join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(text, "utf8")} >> stream\n${text}\nendstream endobj`,
  ];
  const header = "%PDF-1.4\n";
  let body = header;
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(body, "utf8");
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(body, "utf8");
}

function billingRowsToPdfLines(rows: BillingReportRow[]) {
  return rows.flatMap((row) => [
    `${formatDate(row.startsAt)} ${row.organizationName} - ${row.roomName}`,
    `${row.bookingTitle} | ${row.usageTypeName} | ${money(row.amount)} EUR | ${row.status}`,
  ]);
}

function organizationReportLines(rows: BillingReportRow[]) {
  const byOrganization = new Map<string, { name: string; count: number; minutes: number; amount: number }>();

  for (const row of rows) {
    const existing = byOrganization.get(row.organizationId) ?? { name: row.organizationName, count: 0, minutes: 0, amount: 0 };
    existing.count += 1;
    existing.minutes += row.durationMinutes;
    existing.amount += Number(row.amount);
    byOrganization.set(row.organizationId, existing);
  }

  return [...byOrganization.values()].map(
    (organization) =>
      `${organization.name}: ${organization.count} Buchungen, ${organization.minutes} Minuten, ${money(String(organization.amount))} EUR`,
  );
}

function roomUsageReportLines(rows: BillingReportRow[]) {
  const byRoom = new Map<string, { buildingName: string; roomName: string; count: number; minutes: number; amount: number }>();

  for (const row of rows) {
    const existing = byRoom.get(row.roomId) ?? {
      buildingName: row.buildingName,
      roomName: row.roomName,
      count: 0,
      minutes: 0,
      amount: 0,
    };
    existing.count += 1;
    existing.minutes += row.durationMinutes;
    existing.amount += Number(row.amount);
    byRoom.set(row.roomId, existing);
  }

  return [...byRoom.values()].map((room) => `${room.buildingName} - ${room.roomName}: ${room.count} Buchungen, ${room.minutes} Minuten, ${money(String(room.amount))} EUR`);
}

function monthlySummaryReportLines(rows: BillingReportRow[]) {
  const byMonth = new Map<string, { count: number; minutes: number; amount: number }>();

  for (const row of rows) {
    const month = row.periodStart.toISOString().slice(0, 7);
    const existing = byMonth.get(month) ?? { count: 0, minutes: 0, amount: 0 };
    existing.count += 1;
    existing.minutes += row.durationMinutes;
    existing.amount += Number(row.amount);
    byMonth.set(month, existing);
  }

  return [...byMonth.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, summary]) => `${month}: ${summary.count} Buchungen, ${summary.minutes} Minuten, ${money(String(summary.amount))} EUR`);
}

async function maybeMarkExported(input: BillingExportInput, rows: BillingReportRow[], client: ExportClient) {
  if (!input.markExported) {
    return 0;
  }

  const result = await markOpenBillingEntriesExported(
    { entryIds: rows.filter((row) => row.status === "OPEN").map((row) => row.id) },
    client,
  );

  return result.count;
}

async function writeAuditLog(input: BillingExportInput, format: ExportFormat, rows: BillingReportRow[], client: ExportClient) {
  await client.auditEntry.create({
    data: {
      actorUserId: input.actorUserId,
      entityType: "BillingEntry",
      entityId: "billing-export",
      action: `EXPORT_${format.toUpperCase()}`,
      payload: {
        periodStart: input.periodStart.toISOString(),
        periodEnd: input.periodEnd.toISOString(),
        organizationId: input.organizationId ?? null,
        buildingId: input.buildingId ?? null,
        roomId: input.roomId ?? null,
        status: input.status ?? null,
        rowCount: rows.length,
        markedExported: Boolean(input.markExported),
      },
    },
  });
}

async function loadRowsAndRecordExport(
  input: BillingExportInput,
  format: ExportFormat,
  client: ExportClient,
  permissions: ExportPermissions,
) {
  await assertBillingExportPermission(input.actorUserId, permissions);
  const rows = await getBillingReportData(input, client);
  const exportedCount = await maybeMarkExported(input, rows, client);
  await writeAuditLog(input, format, rows, client);
  return { rows, exportedCount };
}

export async function exportBillingCsv(
  input: BillingExportInput,
  client: ExportClient = prisma,
  permissions: ExportPermissions = {},
): Promise<ExportResult> {
  const { rows, exportedCount } = await loadRowsAndRecordExport(input, "csv", client, permissions);
  return {
    content: toCsv(rows),
    contentType: csvContentType,
    fileName: buildFileName("abrechnung", "csv", input),
    exportedCount,
  };
}

export async function exportBillingXlsx(
  input: BillingExportInput,
  client: ExportClient = prisma,
  permissions: ExportPermissions = {},
): Promise<ExportResult> {
  const { rows, exportedCount } = await loadRowsAndRecordExport(input, "xlsx", client, permissions);
  return {
    content: toXlsx(rows),
    contentType: xlsxContentType,
    fileName: buildFileName("abrechnung", "xlsx", input),
    exportedCount,
  };
}

export async function exportBillingPdf(
  input: BillingExportInput,
  client: ExportClient = prisma,
  permissions: ExportPermissions = {},
): Promise<ExportResult> {
  const { rows, exportedCount } = await loadRowsAndRecordExport(input, "pdf", client, permissions);
  const reportType = input.reportType ?? "monthly";
  const title =
    reportType === "roomUsage"
      ? "Raumbelegung Hallenverwaltung St. Valentin"
      : reportType === "organization"
        ? "Vereinsübersicht Hallenverwaltung St. Valentin"
        : "Monatsabrechnung Hallenverwaltung St. Valentin";
  const lines =
    reportType === "roomUsage"
      ? roomUsageReportLines(rows)
      : reportType === "organization"
        ? organizationReportLines(rows)
        : [
            ...monthlySummaryReportLines(rows),
            "",
            ...billingRowsToPdfLines(rows),
          ];

  return {
    content: toPdfLines(title, lines),
    contentType: pdfContentType,
    fileName: buildFileName("abrechnung", "pdf", input),
    exportedCount,
  };
}
