import Link from "next/link";
import { AreaShell } from "@/components/area-shell";
import { Button } from "@/components/ui/button";
import { getPublicAreaEnabled } from "@/lib/services/calendar-settings-service";

export const dynamic = "force-dynamic";

export default async function PublicPage() {
  const publicAreaEnabled = await getPublicAreaEnabled();

  if (!publicAreaEnabled) {
    return (
      <AreaShell
        eyebrow="Öffentlich"
        title="Öffentlicher Bereich deaktiviert"
        description="Der öffentliche Bereich ist für diesen Teststand deaktiviert. Bitte nutzen Sie das Verwaltungs- oder Vereinsportal."
        authenticated={false}
      >
        <div className="mt-10 rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">
            Admin- und Vereinsportal bleiben erreichbar. Die öffentliche Kalenderansicht und der iCal-Export geben in
            diesem Modus keine Belegungsdaten aus.
          </p>
          <Button asChild className="mt-6">
            <Link href="/login">Zum Login</Link>
          </Button>
        </div>
      </AreaShell>
    );
  }

  return (
    <AreaShell
      eyebrow="Öffentlich"
      title="Öffentlicher Bereich"
      description="Ohne Anmeldung erreichbar: öffentlicher Kalender und Login für Portal oder Verwaltung."
      authenticated={false}
    >
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Link
          href="/public/calendar"
          className="flex min-h-44 flex-col justify-center rounded-xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/60"
        >
          <h2 className="text-xl font-semibold tracking-tight">Kalender</h2>
          <p className="mt-3 text-muted-foreground">
            Öffentliche Belegungsansicht mit Tages-, Wochen-, Monats- und Jahresansicht.
          </p>
        </Link>
        <Link
          href="/login"
          className="flex min-h-44 flex-col justify-center rounded-xl border border-primary bg-primary p-6 text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <h2 className="text-xl font-semibold tracking-tight">Zum Login</h2>
          <p className="mt-3 text-sm text-primary-foreground/90">
            Vereinsportal und Verwaltungsportal mit Anmeldung öffnen.
          </p>
        </Link>
      </div>
    </AreaShell>
  );
}
