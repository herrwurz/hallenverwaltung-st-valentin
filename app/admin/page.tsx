import Link from "next/link";
import { requirePermission } from "@/lib/permissions";

export default async function AdminPage() {
  await requirePermission("MANAGE_USERS");
  const cards = [
    { href: "/admin/bookings", label: "Buchungsanträge" },
    { href: "/admin/calendar", label: "Kalender" },
    { href: "/admin/billing", label: "Abrechnung" },
    { href: "/admin/notifications", label: "Benachrichtigungen" },
    { href: "/admin/settings/calendar", label: "Einstellungen" },
    { href: "/admin/waitlist", label: "Warteliste" },
    { href: "/admin/buildings", label: "Gebäude" },
    { href: "/admin/rooms", label: "Räume" },
    { href: "/admin/organizations", label: "Organisationen" },
    { href: "/admin/users", label: "Benutzer" },
    { href: "/admin/roles", label: "Rollen/Rechte" },
  ];

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Dashboard</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Stammdatenverwaltung</h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Gebäude, Räume, Organisationen, Benutzer und Berechtigungszuordnungen verwalten.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex min-h-28 items-center justify-center rounded-xl border border-border bg-card p-5 text-center shadow-sm transition hover:border-primary/60"
          >
            <p className="text-lg font-semibold tracking-tight text-foreground">{card.label}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
