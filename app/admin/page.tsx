import Link from "next/link";
import { BarChart3, CalendarDays, Database, ListChecks } from "lucide-react";
import { requirePermission } from "@/lib/permissions";

const cards = [
  {
    href: "/admin/buildings",
    title: "Stammdaten",
    description: "Gebäude, Räume, Organisationen, Benutzer und Rollen verwalten.",
    icon: Database,
  },
  {
    href: "/admin/bookings",
    title: "Buchungen",
    description: "Buchungsanträge, Serien und Warteliste bearbeiten.",
    icon: ListChecks,
  },
  {
    href: "/admin/calendar",
    title: "Kalender",
    description: "Tages-, Wochen-, Monats- und Jahresansichten prüfen.",
    icon: CalendarDays,
  },
  {
    href: "/admin/reports",
    title: "Berichte",
    description: "Tagesbelegung, Wochenplan, Monats- und Vereinsübersicht drucken.",
    icon: BarChart3,
  },
];

export default async function AdminPage() {
  await requirePermission("MANAGE_USERS");

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Dashboard</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Verwaltungsportal</h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Schnelleinstieg für den Pilotbetrieb. Weitere Auswertungen werden später als eigene Statistik-Karten ergänzt.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="flex min-h-44 flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/60"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xl font-semibold tracking-tight text-foreground">{card.title}</span>
                <span className="mt-2 block text-sm text-muted-foreground">{card.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
