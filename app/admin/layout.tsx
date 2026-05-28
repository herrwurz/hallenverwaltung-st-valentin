import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { hasPermission, requireAnyPermission } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAnyPermission(["MANAGE_USERS", "VIEW_BOOKINGS", "APPROVE_BOOKING", "REJECT_BOOKING", "CREATE_EXPORTS"]);
  const [canManageUsers, canViewBookings, canApproveBookings, canRejectBookings, canCreateExports] = await Promise.all([
    hasPermission(user.id, "MANAGE_USERS"),
    hasPermission(user.id, "VIEW_BOOKINGS"),
    hasPermission(user.id, "APPROVE_BOOKING"),
    hasPermission(user.id, "REJECT_BOOKING"),
    hasPermission(user.id, "CREATE_EXPORTS"),
  ]);
  const navigationItems = [
    ...(canManageUsers ? [{ href: "/admin", label: "Dashboard" }] : []),
    ...(canViewBookings || canApproveBookings || canRejectBookings
      ? [
          { href: "/admin/bookings", label: "Buchungsantraege" },
          { href: "/admin/calendar", label: "Kalender" },
          { href: "/admin/notifications", label: "Benachrichtigungen" },
        ]
      : []),
    ...(canCreateExports ? [{ href: "/admin/billing", label: "Abrechnung" }] : []),
    ...(canManageUsers
      ? [
          { href: "/admin/settings/calendar", label: "Einstellungen" },
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
