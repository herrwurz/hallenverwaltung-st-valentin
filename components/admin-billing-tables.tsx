"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";

export type BillableBookingTableRow = {
  id: string;
  startsAtLabel: string;
  title: string;
  organizationName: string;
  roomName: string;
  usageTypeName: string;
};

export type BillingEntryTableRow = {
  id: string;
  periodStartLabel: string;
  bookingTitle: string;
  organizationName: string;
  tariffName: string;
  calculation: string;
  amountLabel: string;
  status: string;
  statusLabel: string;
};

const billableBookingColumns: ColumnDef<BillableBookingTableRow>[] = [
  { accessorKey: "startsAtLabel", header: "Termin" },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Buchung
      </Button>
    ),
  },
  { accessorKey: "organizationName", header: "Organisation" },
  { accessorKey: "roomName", header: "Raum" },
  { accessorKey: "usageTypeName", header: "Nutzung" },
];

const billingEntryColumns: ColumnDef<BillingEntryTableRow>[] = [
  { accessorKey: "periodStartLabel", header: "Termin" },
  {
    accessorKey: "bookingTitle",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Buchung
      </Button>
    ),
  },
  { accessorKey: "organizationName", header: "Organisation" },
  { accessorKey: "tariffName", header: "Tarif" },
  { accessorKey: "calculation", header: "Berechnung" },
  { accessorKey: "amountLabel", header: "Betrag" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const variant = row.original.status === "OPEN" ? "warning" : row.original.status === "EXPORTED" ? "success" : "secondary";
      return <Badge variant={variant}>{row.original.statusLabel}</Badge>;
    },
  },
];

export function BillableBookingsTable({ rows }: { rows: BillableBookingTableRow[] }) {
  return <DataTable columns={billableBookingColumns} data={rows} searchPlaceholder="Abrechnungsfähige Buchungen filtern..." />;
}

export function BillingEntriesTable({ rows }: { rows: BillingEntryTableRow[] }) {
  return <DataTable columns={billingEntryColumns} data={rows} searchPlaceholder="Abrechnungseinträge filtern..." />;
}
