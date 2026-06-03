"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";

export type DocumentTableRow = {
  id: string;
  fileName: string;
  target: string;
  type: string;
  uploadedAt: string;
  storageKey: string;
};

export type DamageReportTableRow = {
  id: string;
  room: string;
  description: string;
  reportedAt: string;
  status: string;
  resolution: string;
};

export type HolidayTableRow = {
  id: string;
  name: string;
  period: string;
  status: string;
  visibility: string;
  reason: string;
};

export type SystemJobTableRow = {
  id: string;
  createdAt: string;
  job: string;
  status: string;
  processedCount: string;
  errorMessage: string;
};

export type SeriesTableRow = {
  id: string;
  title: string;
  recurrence: string;
  statusLabel: string;
  statusTone: "success" | "destructive" | "warning" | "secondary";
  organization: string;
  room: string;
  period: string;
  occurrences: string;
};

const documentColumns: ColumnDef<DocumentTableRow>[] = [
  { accessorKey: "fileName", header: "Dateiname" },
  { accessorKey: "target", header: "Ziel" },
  { accessorKey: "type", header: "Typ" },
  { accessorKey: "uploadedAt", header: "Hochgeladen" },
  {
    accessorKey: "storageKey",
    header: "Storage-Key",
    cell: ({ row }) => <span className="block max-w-md truncate text-xs text-muted-foreground">{row.original.storageKey}</span>,
  },
];

const damageColumns: ColumnDef<DamageReportTableRow>[] = [
  { accessorKey: "room", header: "Gebäude / Raum" },
  {
    accessorKey: "description",
    header: "Beschreibung",
    cell: ({ row }) => <span className="block max-w-md">{row.original.description}</span>,
  },
  { accessorKey: "reportedAt", header: "Gemeldet" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant="warning">{row.original.status}</Badge>,
  },
  { accessorKey: "resolution", header: "Bearbeitung" },
];

const holidayColumns: ColumnDef<HolidayTableRow>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "period", header: "Zeitraum" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant="warning">{row.original.status}</Badge>,
  },
  { accessorKey: "visibility", header: "Sichtbarkeit" },
  {
    accessorKey: "reason",
    header: "Grund",
    cell: ({ row }) => <span className="block max-w-md text-muted-foreground">{row.original.reason}</span>,
  },
];

const systemJobColumns: ColumnDef<SystemJobTableRow>[] = [
  { accessorKey: "createdAt", header: "Zeitpunkt" },
  { accessorKey: "job", header: "Job" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "processedCount", header: "Verarbeitet" },
  {
    accessorKey: "errorMessage",
    header: "Fehler",
    cell: ({ row }) => <span className={row.original.errorMessage === "-" ? "text-muted-foreground" : "text-destructive"}>{row.original.errorMessage}</span>,
  },
];

const seriesColumns: ColumnDef<SeriesTableRow>[] = [
  { accessorKey: "title", header: "Titel" },
  { accessorKey: "recurrence", header: "Serie" },
  {
    accessorKey: "statusLabel",
    header: "Serienstatus",
    cell: ({ row }) => <Badge variant={row.original.statusTone}>{row.original.statusLabel}</Badge>,
  },
  { accessorKey: "organization", header: "Organisation" },
  { accessorKey: "room", header: "Gebäude / Raum" },
  { accessorKey: "period", header: "Zeitraum" },
  { accessorKey: "occurrences", header: "Einzeltermine" },
];

export function DocumentsDataTable({ rows, portal = false }: { rows: DocumentTableRow[]; portal?: boolean }) {
  const columns = portal
    ? documentColumns.map((column) => (column.header === "Ziel" ? { ...column, header: "Organisation" } : column))
    : documentColumns;
  return <DataTable columns={columns} data={rows} searchPlaceholder="Dokumente filtern..." />;
}

export function DamageReportsDataTable({ rows }: { rows: DamageReportTableRow[] }) {
  return <DataTable columns={damageColumns} data={rows} searchPlaceholder="Schadensmeldungen filtern..." />;
}

export function HolidaysDataTable({ rows }: { rows: HolidayTableRow[] }) {
  return <DataTable columns={holidayColumns} data={rows} searchPlaceholder="Ferien und Sperrzeiten filtern..." />;
}

export function SystemJobsDataTable({ rows }: { rows: SystemJobTableRow[] }) {
  return <DataTable columns={systemJobColumns} data={rows} searchPlaceholder="Jobläufe filtern..." />;
}

export function SeriesDataTable({ rows }: { rows: SeriesTableRow[] }) {
  return <DataTable columns={seriesColumns} data={rows} searchPlaceholder="Serien filtern..." />;
}
