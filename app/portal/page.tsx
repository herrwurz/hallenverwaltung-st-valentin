import Link from "next/link";
import { AreaShell } from "@/components/area-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";

export default async function PortalPage() {
  const user = await requirePermission("REQUEST_BOOKING");

  const links = [
    { href: "/portal/bookings", title: "Buchungsanträge", description: "Einzeltermine beantragen und bestehende Anträge einsehen." },
    { href: "/portal/calendar", title: "Kalender", description: "Tages- und Wochenansicht mit freien Zeiten und eingeschränkter Fremdsicht." },
    { href: "/portal/waitlist", title: "Warteliste", description: "Zeitfenster vormerken und Angebote innerhalb von 48 Stunden annehmen." },
    { href: "/portal/documents", title: "Dokumente", description: "Hallenordnungen, Verträge und Nachweise als Metadaten verwalten." },
    { href: "/portal/damages", title: "Schadensmeldungen", description: "Schäden mit Beschreibung und optionalem Foto-Ablagepfad melden." },
  ];

  return (
    <AreaShell
      eyebrow="Portal"
      title="Organisationsportal"
      description="Geschützter Bereich für Vereine, VHS und Schulen."
      userName={user.name}
    >
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {links.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full transition hover:border-primary/60">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </AreaShell>
  );
}
