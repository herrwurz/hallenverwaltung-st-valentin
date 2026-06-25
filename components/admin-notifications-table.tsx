"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";

export type NotificationTableRow = {
  id: string;
  eventLabel: string;
  recipient: string;
  reference: string;
  createdAtLabel: string;
  sentAtLabel: string;
  attempts: string;
  nextAttemptAtLabel: string;
  status: "PENDING" | "SENT" | "FAILED";
  lastError: string;
};

const columns: ColumnDef<NotificationTableRow>[] = [
  {
    accessorKey: "eventLabel",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Ereignis
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.eventLabel}</p>
        <p className="text-xs text-muted-foreground">{row.original.reference}</p>
      </div>
    ),
  },
  { accessorKey: "recipient", header: "Empfänger" },
  { accessorKey: "createdAtLabel", header: "Erstellt" },
  { accessorKey: "sentAtLabel", header: "Gesendet" },
  { accessorKey: "attempts", header: "Versuche" },
  { accessorKey: "nextAttemptAtLabel", header: "Nächster Versuch" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const variant =
        row.original.status === "SENT" ? "success" : row.original.status === "FAILED" ? "destructive" : "warning";
      const label =
        row.original.status === "SENT" ? "Gesendet" : row.original.status === "FAILED" ? "Fehlgeschlagen" : "Wartend";
      return <Badge variant={variant}>{label}</Badge>;
    },
  },
  { accessorKey: "lastError", header: "Fehler" },
];

export function NotificationsTable({ rows }: { rows: NotificationTableRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Benachrichtigungen filtern..." />;
}
