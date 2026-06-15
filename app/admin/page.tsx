import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { getAdminDashboardSummary } from "@/lib/services/admin/dashboard-service";

export default async function AdminPage() {
  await requirePermission("MANAGE_USERS");
  const summary = await getAdminDashboardSummary();
  const cards = [
    { href: "/admin/bookings", label: "Buchungsanträge" },
    { href: "/admin/calendar", label: "Kalender" },
    { href: "/admin/billing", label: "Abrechnung" },
    { href: "/admin/settings/mail", label: "Mail / SMTP" },
    { href: "/admin/settings/notifications", label: "Benachrichtigungsregeln" },
    { href: "/admin/notifications", label: "Notification Queue" },
    { href: "/admin/waitlist", label: "Warteliste" },
    { href: "/admin/buildings", label: "Gebäude" },
    { href: "/admin/rooms", label: "Räume" },
    { href: "/admin/organizations", label: "Organisationen" },
    { href: "/admin/users", label: "Benutzer" },
    { href: "/admin/roles", label: "Rollen/Rechte" },
    { href: "/admin/settings", label: "Systemeinstellungen" },
  ];

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Dashboard</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Stammdatenverwaltung</h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Gebäude, Räume, Organisationen, Benutzer und Berechtigungszuordnungen verwalten.
      </p>
      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Offene Anträge"
          value={summary.bookingReview.totalOpen}
          detail={`${summary.bookingReview.requested} beantragt, ${summary.bookingReview.inReview} in Prüfung`}
          href="/admin/bookings?status=OPEN"
        />
        <DashboardStatCard
          label="Genehmigt im Monat"
          value={summary.usage.approvedThisMonth}
          detail={`${summary.usage.activeBuildings} aktive Gebäude, ${summary.usage.activeRooms} aktive Räume`}
          href="/admin/calendar"
        />
        <DashboardStatCard
          label="Warteliste offen"
          value={summary.waitlist.totalOpen}
          detail={`${summary.waitlist.active} beantragt, ${summary.waitlist.offered} angeboten`}
          href="/admin/waitlist"
        />
        <DashboardStatCard
          label="Mailfehler"
          value={summary.notifications.failed}
          detail="Fehlgeschlagene Benachrichtigungen prüfen"
          href="/admin/notifications?status=FAILED"
          tone={summary.notifications.failed > 0 ? "warning" : "default"}
        />
      </section>
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

function DashboardStatCard({
  label,
  value,
  detail,
  href,
  tone = "default",
}: {
  label: string;
  value: number;
  detail: string;
  href: string;
  tone?: "default" | "warning";
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border p-5 shadow-sm transition hover:border-primary/60 ${
        tone === "warning" ? "border-amber-500/20 bg-amber-500/10" : "border-border bg-card"
      }`}
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </Link>
  );
}
