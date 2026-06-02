"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";

export type UserTableRow = {
  id: string;
  displayName: string;
  email: string;
  roles: string;
  organizations: string;
  isActive: boolean;
};

export type RoleTableRow = {
  id: string;
  name: string;
  code: string;
  userCount: number;
  permissionCount: number;
};

export type PermissionTableRow = {
  id: string;
  name: string;
  code: string;
};

export type WaitlistTableRow = {
  id: string;
  title: string;
  organizationName: string;
  roomName: string;
  startsAtLabel: string;
  endsAtLabel: string;
  usageTypeName: string;
  placedAtLabel: string;
  offerExpiresAtLabel: string;
  status: string;
  statusLabel: string;
};

const userColumns: ColumnDef<UserTableRow>[] = [
  {
    accessorKey: "displayName",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Benutzer
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.displayName}</p>
        <p className="text-xs text-muted-foreground">{row.original.email}</p>
      </div>
    ),
  },
  { accessorKey: "roles", header: "Rollen" },
  { accessorKey: "organizations", header: "Organisationen" },
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

const roleColumns: ColumnDef<RoleTableRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Rolle
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.code}</p>
      </div>
    ),
  },
  { accessorKey: "userCount", header: "Benutzer" },
  { accessorKey: "permissionCount", header: "Rechte" },
];

const permissionColumns: ColumnDef<PermissionTableRow>[] = [
  {
    accessorKey: "name",
    header: "Recht",
  },
  {
    accessorKey: "code",
    header: "Code",
  },
];

const waitlistColumns: ColumnDef<WaitlistTableRow>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Wartelistenplatz
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
  { accessorKey: "roomName", header: "Raum" },
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
  { accessorKey: "placedAtLabel", header: "Eingereiht" },
  { accessorKey: "offerExpiresAtLabel", header: "Frist" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const variant = row.original.status === "ACTIVE" ? "success" : row.original.status === "OFFERED" ? "warning" : "secondary";
      return <Badge variant={variant}>{row.original.statusLabel}</Badge>;
    },
  },
];

export function UsersTable({ rows }: { rows: UserTableRow[] }) {
  return <DataTable columns={userColumns} data={rows} searchPlaceholder="Benutzer filtern..." />;
}

export function RolesTable({ rows }: { rows: RoleTableRow[] }) {
  return <DataTable columns={roleColumns} data={rows} searchPlaceholder="Rollen filtern..." />;
}

export function PermissionsTable({ rows }: { rows: PermissionTableRow[] }) {
  return <DataTable columns={permissionColumns} data={rows} searchPlaceholder="Rechte filtern..." />;
}

export function WaitlistTable({ rows }: { rows: WaitlistTableRow[] }) {
  return <DataTable columns={waitlistColumns} data={rows} searchPlaceholder="Warteliste filtern..." />;
}
