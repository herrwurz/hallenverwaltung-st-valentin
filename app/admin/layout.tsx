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
    "REPORT_NO_SHOW",
    "MANAGE_HANDOVERS",
    "MANAGE_ACCESS",
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
    canReportNoShow,
    canManageHandovers,
    canManageAccess,
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
    hasPermission(user.id, "REPORT_NO_SHOW"),
    hasPermission(user.id, "MANAGE_HANDOVERS"),
    hasPermission(user.id, "MANAGE_ACCESS"),
  ]);

  const navigationItems = [
    ...(canManageUsers ? [{ href: "/admin", label: "Dashboard" }] : []),
    ...(canViewBookings || canApproveBookings || canRejectBookings ? [{ href: "/admin/calendar", label: "Kalender" }] : []),
    ...(canManageUsers
      ? [
          { href: "/admin/users", label: "Benutzer", groupLabel: "Stammdaten" },
          { href: "/admin/roles", label: "Rollen/Rechte", groupLabel: "Stammdaten" },
          { href: "/admin/buildings", label: "Gebäude", groupLabel: "Stammdaten" },
          { href: "/admin/organizations", label: "Organisationen", groupLabel: "Stammdaten" },
          { href: "/admin/rooms", label: "Räume", groupLabel: "Stammdaten" },
        ]
      : []),
    ...(canViewBookings || canApproveBookings || canRejectBookings
      ? [
          { href: "/admin/bookings", label: "Buchungsanträge", groupLabel: "Buchungen" },
          { href: "/admin/booking-changes", label: "Änderungsanträge", groupLabel: "Buchungen" },
          { href: "/admin/series", label: "Serien", groupLabel: "Buchungen" },
          { href: "/admin/waitlist", label: "Warteliste", groupLabel: "Buchungen" },
        ]
      : []),
    ...(canCreateExports ? [{ href: "/admin/billing", label: "Abrechnung", groupLabel: "Extras" }] : []),
    ...(canManageDocuments ? [{ href: "/admin/documents", label: "Dokumente", groupLabel: "Extras" }] : []),
    ...(canManageDamage ? [{ href: "/admin/damages", label: "Schäden", groupLabel: "Extras" }] : []),
    ...(canManageHandovers ? [{ href: "/admin/handovers", label: "Hallenübergaben", groupLabel: "Extras" }] : []),
    ...(canManageAccess ? [{ href: "/admin/access", label: "Zutritte", groupLabel: "Extras" }] : []),
    ...(canManageUsers
      ? [
          ...(canBlockRoom ? [{ href: "/admin/holidays", label: "Ferien", groupLabel: "Einstellungen" }] : []),
          { href: "/admin/settings", label: "Systemeinstellungen", groupLabel: "Einstellungen" },
          { href: "/admin/settings/mail", label: "Mail / SMTP", groupLabel: "Einstellungen" },
          { href: "/admin/settings/notifications", label: "Benachrichtigungsregeln", groupLabel: "Einstellungen" },
          { href: "/admin/settings/calendar", label: "Öffentlicher Kalender", groupLabel: "Einstellungen" },
          ...(canManageSystemJobs ? [{ href: "/admin/system/jobs", label: "System-Jobs", groupLabel: "Einstellungen" }] : []),
          ...(process.env.TEST_DATA_TOOLS_ENABLED === "true" && (user.roles.includes("SUPER_ADMIN") || user.roles.includes("SYSTEM_ADMIN"))
            ? [{ href: "/admin/system/test-data", label: "Testdaten", groupLabel: "Einstellungen" }]
            : []),
          ...(canReportNoShow ? [{ href: "/admin/no-shows", label: "No-Shows", groupLabel: "Einstellungen" }] : []),
          ...(canViewBookings || canApproveBookings || canRejectBookings
            ? [{ href: "/admin/notifications", label: "Benachrichtigungs-Queue", groupLabel: "Einstellungen" }]
            : []),
        ]
      : []),
  ];

  return <AdminShell navigationItems={navigationItems} userName={user.name}>{children}</AdminShell>;
}
