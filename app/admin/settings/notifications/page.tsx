import { updateSettingsNotificationEventsAction } from "@/app/admin/settings/notifications/actions";
import { AppBackLink } from "@/components/app-back-link";
import { AppFeedback } from "@/components/app-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import { getNotificationEventSettings, notificationEventLabels } from "@/lib/services/notification-settings-service";
import { notificationEventCodes } from "@/lib/services/notification-types";

type SearchParams = Promise<{
  saved?: string;
  error?: string;
}>;

export default async function AdminNotificationSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("MANAGE_USERS");
  const [params, eventSettings] = await Promise.all([searchParams, getNotificationEventSettings()]);

  return (
    <>
      <div className="mb-6">
        <AppBackLink href="/admin/settings" label="Zurück zu den Einstellungen" />
      </div>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Einstellungen</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Benachrichtigungsregeln</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Diese Schalter steuern, für welche fachlichen Ereignisse Benachrichtigungen in die Queue geschrieben werden.
        Der eigentliche Versand läuft weiterhin über die Benachrichtigungs-Queue und den Worker.
      </p>

      <AppFeedback
        messages={[
          { tone: "success", text: params.saved ? "Die Event-Schalter wurden gespeichert." : undefined },
          { tone: "error", text: params.error },
        ]}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Aktive Mailereignisse</CardTitle>
          <CardDescription>
            Deaktivierte Ereignisse erzeugen keine neue Benachrichtigung. Bereits vorhandene Queue-Einträge bleiben
            erhalten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateSettingsNotificationEventsAction} className="space-y-3">
            {notificationEventCodes.map((eventCode) => (
              <label key={eventCode} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4">
                <span>
                  <span className="block font-medium">{notificationEventLabels[eventCode]}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{eventCode}</span>
                </span>
                <input type="checkbox" name={eventCode} defaultChecked={eventSettings[eventCode]} className="h-5 w-5" />
              </label>
            ))}
            <div className="flex justify-end">
              <Button>Schalter speichern</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
