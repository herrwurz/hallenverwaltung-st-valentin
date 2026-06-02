"use client";

import type { BookingStatus } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { getBookingStatusBadgeClass, getBookingStatusLabel } from "@/lib/booking-status";

export type AdminBookingTableRow = {
  id: string;
  title: string;
  usageTypeName: string;
  organizationName: string;
  buildingName: string;
  roomName: string;
  startsAtLabel: string;
  endsAtLabel: string;
  status: BookingStatus;
  conflictCount: number;
  hasBlockingConflict: boolean;
};

const columns: ColumnDef<AdminBookingTableRow>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Titel
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{row.original.usageTypeName}</p>
      </div>
    ),
  },
  {
    accessorKey: "organizationName",
    header: "Organisation",
  },
  {
    accessorKey: "buildingName",
    header: "Gebäude / Raum",
    cell: ({ row }) => (
      <div>
        <p>{row.original.buildingName}</p>
        <p className="text-xs text-muted-foreground">{row.original.roomName}</p>
      </div>
    ),
  },
  {
    accessorKey: "startsAtLabel",
    header: "Zeitraum",
    cell: ({ row }) => (
      <div className="min-w-60">
        {row.original.startsAtLabel}
        <br />
        <span className="text-xs text-muted-foreground">bis {row.original.endsAtLabel}</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getBookingStatusBadgeClass(row.original.status)}`}>
        {getBookingStatusLabel(row.original.status)}
      </span>
    ),
  },
  {
    accessorKey: "conflictCount",
    header: "Konflikte",
    cell: ({ row }) => (
      <div className="text-right">
        <Badge variant={row.original.hasBlockingConflict ? "destructive" : row.original.conflictCount ? "warning" : "success"}>
          {row.original.conflictCount}
        </Badge>
      </div>
    ),
  },
];

export function AdminBookingsTable({ rows }: { rows: AdminBookingTableRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Buchungen filtern..." />;
}
