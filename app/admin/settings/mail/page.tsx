import { sendSettingsTestMailAction } from "@/app/admin/settings/mail/actions";
import { AppBackLink } from "@/components/app-back-link";
import { AppFeedback } from "@/components/app-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import { getSmtpConfigurationStatus } from "@/lib/services/mail-service";

type SearchParams = Promise<{
  testSent?: string;
  error?: string;
}>;

function maskValue(value: string | null) {
  if (!value) {
    return "nicht gesetzt";
  }

  if (value.length <= 6) {
    return "***";
  }

  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

export default async function AdminMailSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("MANAGE_USERS");
  const [params, smtpStatus] = await Promise.all([searchParams, Promise.resolve(getSmtpConfigurationStatus())]);

  return (
    <>
      <div className="mb-6">
        <AppBackLink href="/admin/settings" label="Zurück zu den Einstellungen" />
      </div>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Einstellungen</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Mail / SMTP</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        SMTP ist ein Betriebsparameter und wird über `.env` oder die Serverumgebung gesetzt. Passwörter werden hier
        bewusst nicht angezeigt und nicht in der Datenbank gespeichert.
      </p>

      <AppFeedback
        messages={[
          { tone: "success", text: params.testSent ? "Testmail wurde vom SMTP-Server angenommen (250 OK). Bitte Posteingang und Spam-Ordner prüfen." : undefined },
          { tone: "error", text: params.error },
        ]}
      />

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>SMTP-Status</CardTitle>
            <CardDescription>Technische Mailkonfiguration aus der Serverumgebung.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div
              className={`rounded-xl border p-4 ${
                smtpStatus.configured
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-900"
              }`}
            >
              <p className="font-medium">{smtpStatus.configured ? "SMTP ist produktiv konfiguriert." : "SMTP ist noch nicht vollständig produktiv konfiguriert."}</p>
              {!smtpStatus.configured ? (
                <p className="mt-1">
                  {smtpStatus.usesPlaceholder
                    ? "Es sind Platzhalterwerte gesetzt. Testmails werden service-seitig bewusst blockiert."
                    : `Fehlende Werte: ${smtpStatus.missingFields.join(", ") || "unbekannt"}.`}
                </p>
              ) : null}
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <Info label="Host" value={maskValue(smtpStatus.host)} />
              <Info label="Port" value={smtpStatus.port ?? "nicht gesetzt"} />
              <Info label="TLS/SSL" value={smtpStatus.secure === "true" ? "aktiv" : "nicht aktiv"} />
              <Info label="SMTP-Benutzer" value={smtpStatus.userConfigured ? "gesetzt" : "nicht gesetzt"} />
              <Info label="SMTP-Passwort" value={smtpStatus.passwordConfigured ? "gesetzt, verborgen" : "nicht gesetzt"} />
              <Info label="Absender" value={smtpStatus.fromEmail ?? "nicht gesetzt"} />
              <Info label="Absendername" value={smtpStatus.fromName} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Testmail senden</CardTitle>
            <CardDescription>Prüft Template, Queue und SMTP-Versandweg mit einer frei wählbaren Adresse.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={sendSettingsTestMailAction} className="space-y-4">
              <label className="block text-sm font-medium">
                Empfänger
                <input
                  name="recipient"
                  type="email"
                  required
                  placeholder="test@example.at"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                />
              </label>
              <label className="block text-sm font-medium">
                Hinweis (optional)
                <input
                  name="note"
                  maxLength={500}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                />
              </label>
              <Button>Testmail senden</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <dt className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-medium">{value}</dd>
    </div>
  );
}
