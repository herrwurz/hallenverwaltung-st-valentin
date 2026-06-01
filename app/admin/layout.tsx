import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { hasPermission, requireAnyPermission } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAnyPermission([
    "MANAGE_USERS",
    "VIEW_BOOKINGS",
    "APPROVE_BOOKING",
    "REJECT_BOOKING",
    "BILLING_EXPORT",
    "MANAGE_SYSTEM_JOBS",
    "MANAGE_DOCUMENTS",
    "MANAGE_DAMAGE",
    "BLOCK_ROOM",
  ]);
  const [
    canManageUsers,
    canViewBookings,
    canApproveBookings,
    canRejectBookings,
    canCreateExports,
    canManageSystemJobs,
    canManageDocuments,
    canManageDamage,
    canBlockRoom,
  ] = await Promise.all([
    hasPermission(user.id, "MANAGE_USERS"),
    hasPermission(user.id, "VIEW_BOOKINGS"),
    hasPermission(user.id, "APPROVE_BOOKING"),
    hasPermission(user.id, "REJECT_BOOKING"),
    hasPermission(user.id, "BILLING_EXPORT"),
    hasPermission(user.id, "MANAGE_SYSTEM_JOBS"),
    hasPermission(user.id, "MANAGE_DOCUMENTS"),
    hasPermission(user.id, "MANAGE_DAMAGE"),
    hasPermission(user.id, "BLOCK_ROOM"),
  ]);
  const navigationItems = [
    ...(canManageUsers ? [{ href: "/admin", label: "Dashboard" }] : []),
    ...(canViewBookings || canApproveBookings || canRejectBookings
      ? [
          { href: "/admin/bookings", label: "Buchungsantraege" },
          { href: "/admin/booking-changes", label: "Aenderungsantraege" },
          { href: "/admin/series", label: "Serien" },
          { href: "/admin/calendar", label: "Kalender" },
          { href: "/admin/notifications", label: "Benachrichtigungen" },
        ]
      : []),
    ...(canBlockRoom ? [{ href: "/admin/holidays", label: "Ferien" }] : []),
    ...(canCreateExports ? [{ href: "/admin/billing", label: "Abrechnung" }] : []),
    ...(canManageSystemJobs ? [{ href: "/admin/system/jobs", label: "System-Jobs" }] : []),
    ...(canManageDocuments ? [{ href: "/admin/documents", label: "Dokumente" }] : []),
    ...(canManageDamage ? [{ href: "/admin/damages", label: "Schaeden" }] : []),
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
