import Link from "next/link";
import { AreaShell } from "@/components/area-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicOverview } from "@/lib/services/public-service";

export const dynamic = "force-dynamic";

const visibilityLabels = {
  occupied_only: "Nur belegt/frei",
  organization: "Vereinsname sichtbar",
  event: "Veranstaltungsname sichtbar",
} as const;

export default async function PublicPage() {
  const overview = await getPublicOverview();

  return (
    <AreaShell
      eyebrow="Öffentlich"
      title="Öffentlicher Bereich"
      description="Dieser Bereich ist ohne Anmeldung erreichbar. Hier stehen die öffentliche Hallenbelegung, freie Zeiten und der Login ins Portal bereit."
      authenticated={false}
    >
      <section className="mt-10 grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Gebäude</p>
          <p className="mt-2 text-3xl font-semibold">{overview.buildingCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Räume</p>
          <p className="mt-2 text-3xl font-semibold">{overview.roomCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Nächste Belegungen</p>
          <p className="mt-2 text-3xl font-semibold">{overview.nextEventCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Datenschutz</p>
          <p className="mt-2 text-lg font-medium">{visibilityLabels[overview.visibilityMode]}</p>
        </Card>
      </section>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Link
          href="/public/calendar"
          className="rounded-xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/60"
        >
          <h2 className="text-lg font-semibold tracking-tight">Kalender</h2>
          <p className="mt-2 text-muted-foreground">Lesende Belegungsansicht mit Tages-, Wochen- und freie-Zeiten-Sicht.</p>
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-primary bg-primary p-6 text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <h2 className="text-lg font-semibold tracking-tight">Zum Login</h2>
          <p className="mt-2 text-sm text-primary-foreground/90">Vereinsportal und Verwaltungsportal mit Anmeldung öffnen.</p>
        </Link>
      </div>

      <Card className="mt-10">
        <CardHeader>
          <CardTitle>Standorte</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.buildings.length === 0 ? (
            <CardDescription>Derzeit sind keine öffentlich verfügbaren Standorte aktiv.</CardDescription>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {overview.buildings.map((building) => (
                <div key={building.id} className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="font-medium">{building.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{building.roomCount} aktive Räume</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AreaShell>
  );
}
