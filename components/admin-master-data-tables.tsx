"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";

export type BuildingTableRow = {
  id: string;
  code: string;
  name: string;
  address: string;
  roomCount: number;
  caretakerName: string;
  isActive: boolean;
};

export type RoomTableRow = {
  id: string;
  code: string;
  name: string;
  buildingName: string;
  parentRoomName: string;
  status: string;
  openingTime: string;
  closingTime: string;
};

export type OrganizationTableRow = {
  id: string;
  name: string;
  organizationTypeName: string;
  memberCount: number;
  status: string;
  blockedReason: string;
};

const buildingColumns: ColumnDef<BuildingTableRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Gebäude
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.code}</p>
      </div>
    ),
  },
  { accessorKey: "address", header: "Adresse" },
  { accessorKey: "roomCount", header: "Räume" },
  { accessorKey: "caretakerName", header: "Hauswart" },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "success" : "secondary"}>
        {row.original.isActive ? "Aktiv" : "Inaktiv"}
      </Badge>
    ),
  },
];

const roomColumns: ColumnDef<RoomTableRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Raum
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.code}</p>
      </div>
    ),
  },
  { accessorKey: "buildingName", header: "Gebäude" },
  { accessorKey: "parentRoomName", header: "Teilbereich von" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.status === "ACTIVE" ? "success" : row.original.status === "RESTRICTED" ? "warning" : "secondary"}>
        {row.original.status === "ACTIVE"
          ? "Aktiv"
          : row.original.status === "RESTRICTED"
            ? "Eingeschränkt"
            : "Außer Betrieb"}
      </Badge>
    ),
  },
  {
    accessorKey: "openingTime",
    header: "Öffnungszeit",
    cell: ({ row }) => `${row.original.openingTime} bis ${row.original.closingTime}`,
  },
];

const organizationColumns: ColumnDef<OrganizationTableRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Organisation
      </Button>
    ),
  },
  { accessorKey: "organizationTypeName", header: "Typ" },
  { accessorKey: "memberCount", header: "Mitglieder" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.status === "ACTIVE" ? "success" : row.original.status === "BLOCKED" ? "destructive" : "secondary"}>
        {row.original.status === "ACTIVE" ? "Aktiv" : row.original.status === "BLOCKED" ? "Gesperrt" : "Inaktiv"}
      </Badge>
    ),
  },
  { accessorKey: "blockedReason", header: "Sperrgrund" },
];

export function BuildingsTable({ rows }: { rows: BuildingTableRow[] }) {
  return <DataTable columns={buildingColumns} data={rows} searchPlaceholder="Gebäude filtern..." />;
}

export function RoomsTable({ rows }: { rows: RoomTableRow[] }) {
  return <DataTable columns={roomColumns} data={rows} searchPlaceholder="Räume filtern..." />;
}

export function OrganizationsTable({ rows }: { rows: OrganizationTableRow[] }) {
  return <DataTable columns={organizationColumns} data={rows} searchPlaceholder="Organisationen filtern..." />;
}
