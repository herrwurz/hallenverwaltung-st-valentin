import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { hasPermission, requireAnyPermission } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAnyPermission(["MANAGE_USERS", "VIEW_BOOKINGS", "APPROVE_BOOKING", "REJECT_BOOKING"]);
  const [canManageUsers, canViewBookings, canApproveBookings, canRejectBookings] = await Promise.all([
    hasPermission(user.id, "MANAGE_USERS"),
    hasPermission(user.id, "VIEW_BOOKINGS"),
    hasPermission(user.id, "APPROVE_BOOKING"),
    hasPermission(user.id, "REJECT_BOOKING"),
  ]);
  const navigationItems = [
    ...(canManageUsers ? [{ href: "/admin", label: "Dashboard" }] : []),
    ...(canViewBookings || canApproveBookings || canRejectBookings
      ? [{ href: "/admin/bookings", label: "Buchungsantraege" }]
      : []),
    ...(canManageUsers
      ? [
          { href: "/admin/buildings", label: "Gebaeude" },
          { href: "/admin/rooms", label: "Raeume" },
          { href: "/admin/organizations", label: "Organisationen" },
          { href: "/admin/users", label: "Benutzer" },
          { href: "/admin/roles", label: "Rollen/Rechte" },
        ]
      : []),
  ];

  return <AdminShell navigationItems={navigationItems} userName={user.name}>{children}</AdminShell>;
}
