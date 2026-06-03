import { updateCalendarVisibilitySettingAction } from "@/app/admin/settings/calendar/actions";
import { AppBackLink } from "@/components/app-back-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import {
  getPublicCalendarVisibilityMode,
  publicCalendarVisibilityModes,
  type PublicCalendarVisibilityMode,
} from "@/lib/services/calendar-settings-service";

const optionLabels: Record<PublicCalendarVisibilityMode, { title: string; description: string }> = {
  occupied_only: {
    title: "Nur belegt/frei",
    description: "Im öffentlichen Kalender wird nur angezeigt, dass ein Zeitraum belegt ist.",
  },
  organization: {
    title: "Vereinsname anzeigen",
    description: "Wenn ein Raum es erlaubt, wird im öffentlichen Kalender der Vereinsname angezeigt.",
  },
  event: {
    title: "Veranstaltungsname anzeigen",
    description: "Wenn ein Raum es erlaubt, wird im öffentlichen Kalender der Veranstaltungstitel angezeigt.",
  },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function normalizeSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCalendarSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("MANAGE_USERS");
  const [mode, params] = await Promise.all([getPublicCalendarVisibilityMode(), searchParams]);
  const error = normalizeSearchParam(params.error);
  const saved = normalizeSearchParam(params.saved);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Einstellungen</p>
      <h2 className="mt-3 text-3xl font-semibold">Öffentlicher Kalender</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Hier wird festgelegt, welche Details die Öffentlichkeit im Kalender sehen darf. Ohne passende Raumfreigabe
        bleibt die sichere Anzeige immer bei belegt oder frei.
      </p>

      <div className="mt-8 flex items-center justify-between gap-4">
        <AppBackLink href="/admin/calendar" label="Zurück zum Kalender" />
      </div>

      {saved ? (
        <p className="mt-6 rounded-lg border border-emerald-500/20 bg-success/10 p-4 text-sm text-emerald-700">
          Die Einstellung wurde gespeichert.
        </p>
      ) : null}
      {error ? (
        <p className="mt-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Datenschutzeinstellung</CardTitle>
          <CardDescription>
            Die sichere Standardeinstellung bleibt belegt/frei. Mehr Details werden nur angezeigt, wenn die Räume das
            zulassen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateCalendarVisibilitySettingAction} className="space-y-4">
            {publicCalendarVisibilityModes.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-start gap-4 rounded-xl border border-border bg-muted/40 p-4 transition hover:border-primary/40"
              >
                <input
                  type="radio"
                  name="mode"
                  value={option}
                  defaultChecked={mode === option}
                  className="mt-1 h-4 w-4 border-input bg-card text-primary"
                />
                <span>
                  <span className="block font-medium">{optionLabels[option].title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{optionLabels[option].description}</span>
                </span>
              </label>
            ))}

            <div className="flex justify-end">
              <Button>Einstellung speichern</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
