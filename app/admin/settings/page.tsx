import Link from "next/link";
import { Bell, CalendarDays, Mail, ShieldCheck } from "lucide-react";
import { AppBackLink } from "@/components/app-back-link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";

const settingsCards = [
  {
    href: "/admin/settings/mail",
    title: "Mail / SMTP",
    description: "SMTP-Status, maskierte Serverparameter und Testmail.",
    icon: Mail,
  },
  {
    href: "/admin/settings/notifications",
    title: "Benachrichtigungsregeln",
    description: "Event-Schalter für Buchungen, Warteliste, Sperren und weitere Mailereignisse.",
    icon: Bell,
  },
  {
    href: "/admin/settings/calendar",
    title: "Öffentlicher Kalender",
    description: "Public-Bereich und Datenschutzstufe für öffentliche Kalenderdetails.",
    icon: CalendarDays,
  },
  {
    href: "/admin/roles",
    title: "Rollen / Rechte",
    description: "Rollen und serverseitige Rechtezuordnungen verwalten.",
    icon: ShieldCheck,
  },
] as const;

export default async function AdminSettingsPage() {
  await requirePermission("MANAGE_USERS");

  return (
    <>
      <div className="mb-6">
        <AppBackLink href="/admin" label="Zurück zum Dashboard" />
      </div>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Verwaltung</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Systemeinstellungen</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Zentrale Einstellungen für den Test- und Gemeindebetrieb. Fachliche Parameter werden über `SystemSetting`
        gespeichert; technische Secrets wie SMTP-Passwort, Datenbank-URL oder Auth-Secret bleiben in der Serverumgebung.
      </p>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {settingsCards.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group block">
              <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="pt-2 group-hover:text-primary">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Technische Secrets</CardTitle>
          <CardDescription>
            SMTP-Passwort, Datenbankzugang, Auth-Secret und vergleichbare Betriebswerte werden nicht über die
            Weboberfläche geändert. Änderungen erfolgen über `.env`, Serverumgebung oder Deployment-Konfiguration.
          </CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}
