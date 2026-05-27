import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { getAdminDashboardData } from "@/lib/services/admin/dashboard-service";

export default async function AdminPage() {
  await requirePermission("MANAGE_USERS");
  const summary = await getAdminDashboardData();
  const cards = [
    { href: "/admin/bookings", label: "Buchungsantraege", value: "Workflow" },
    { href: "/admin/calendar", label: "Kalender", value: "Tag/Woche" },
    { href: "/admin/settings/calendar", label: "Einstellungen", value: "Datenschutz" },
    { href: "/admin/waitlist", label: "Warteliste", value: "Queue" },
    { href: "/admin/buildings", label: "Gebaeude", value: summary.buildingCount },
    { href: "/admin/rooms", label: "Raeume", value: summary.roomCount },
    { href: "/admin/organizations", label: "Organisationen", value: summary.organizationCount },
    { href: "/admin/users", label: "Benutzer", value: summary.userCount },
    { href: "/admin/roles", label: "Rollen", value: summary.roleCount },
  ];

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Dashboard</p>
      <h2 className="mt-3 text-3xl font-semibold">Stammdatenverwaltung</h2>
      <p className="mt-3 max-w-2xl text-slate-300">
        Gebaeude, Raeume, Organisationen, Benutzer und Berechtigungszuordnungen verwalten.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-sky-700"
          >
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold">{card.value}</p>
          </Link>
        ))}
      </div>
      <p className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
        Buchungsantraege, Warteliste und lesende Kalenderansichten sind angebunden. Mailversand und Abrechnung sind
        weiterhin noch nicht enthalten.
      </p>
    </>
  );
}
