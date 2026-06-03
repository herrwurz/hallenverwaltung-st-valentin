import { processExpiredWaitlistOffersJobAction, processNotificationQueueJobAction, runMaintenanceJobsAction } from "@/app/admin/system/jobs/actions";
import { AppBackLink } from "@/components/app-back-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/permissions";
import { getWorkerJobRuns } from "@/lib/services/worker-service";

type SearchParams = Promise<{
  job?: string;
  processed?: string;
  error?: string;
}>;

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

function payloadValue(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object" || !(key in payload)) {
    return null;
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

export default async function AdminSystemJobsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("MANAGE_SYSTEM_JOBS");
  const params = await searchParams;
  const runs = await getWorkerJobRuns(20);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">System</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">System-Jobs</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Manuelle Ausführung der Hintergrundjobs für Benachrichtigungen und Wartelistenangebote. Für den
            Serverbetrieb kann derselbe Ablauf per CLI/Cron gestartet werden.
          </p>
        </div>
        <AppBackLink href="/admin" label="Zurück zum Dashboard" />
      </div>

      {params.job ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Job {params.job} ausgeführt. Verarbeitete Einträge: {params.processed ?? "0"}.
        </p>
      ) : null}
      {params.error ? (
        <p className="mt-6 rounded-lg border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">{params.error}</p>
      ) : null}

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <form action={processNotificationQueueJobAction} className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-medium">Notification Queue</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Verarbeitet fällige PENDING/FAILED E-Mail-Benachrichtigungen unter Beachtung von Backoff und maxAttempts.
          </p>
          <Button className="mt-5">Queue verarbeiten</Button>
        </form>

        <form action={processExpiredWaitlistOffersJobAction} className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-medium">Wartelistenablauf</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Lässt abgelaufene OFFERED-Einträge auslaufen und aktiviert servicekonform den nächsten passenden Platz.
          </p>
          <Button className="mt-5">Angebote verarbeiten</Button>
        </form>

        <form action={runMaintenanceJobsAction} className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-medium">Maintenance</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Führt Notification Queue und Wartelistenablauf in einem Wartungslauf aus und protokolliert das Ergebnis.
          </p>
          <Button className="mt-5">Maintenance ausführen</Button>
        </form>
      </section>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Letzte Ausführungen</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Noch keine Job-Protokolle vorhanden.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table className="min-w-[780px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Zeitpunkt</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verarbeitet</TableHead>
                    <TableHead>Fehler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="text-muted-foreground">{dateFormatter.format(run.createdAt)}</TableCell>
                      <TableCell className="font-medium">{run.entityId}</TableCell>
                      <TableCell className="text-muted-foreground">{run.action}</TableCell>
                      <TableCell className="text-muted-foreground">{payloadValue(run.payload, "processedCount") ?? "0"}</TableCell>
                      <TableCell className="text-destructive">{payloadValue(run.payload, "errorMessage") ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
