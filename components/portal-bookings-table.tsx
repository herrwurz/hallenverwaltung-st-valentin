"use client";

import type { BookingStatus } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { getBookingStatusBadgeClass, getBookingStatusLabel } from "@/lib/booking-status";

export type PortalBookingTableRow = {
  id: string;
  title: string;
  organizationName: string;
  buildingName: string;
  roomName: string;
  usageTypeName: string;
  startsAtLabel: string;
  endsAtLabel: string;
  status: BookingStatus;
};

const columns: ColumnDef<PortalBookingTableRow>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Antrag
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.title}</p>
        <p className="text-xs text-muted-foreground">{row.original.usageTypeName}</p>
      </div>
    ),
  },
  { accessorKey: "organizationName", header: "Organisation" },
  {
    accessorKey: "buildingName",
    header: "Raum",
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
      <div>
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
];

export function PortalBookingsTable({ rows }: { rows: PortalBookingTableRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Buchungsanträge filtern..." />;
}
