import { processExpiredWaitlistOffersJobAction, processNotificationQueueJobAction, runMaintenanceJobsAction } from "@/app/admin/system/jobs/actions";
import { AppBackLink } from "@/components/app-back-link";
import { AppFeedback } from "@/components/app-feedback";
import { SystemJobsDataTable, type SystemJobTableRow } from "@/components/phase25-data-tables";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const runRows: SystemJobTableRow[] = runs.map((run) => ({
    id: run.id,
    createdAt: dateFormatter.format(run.createdAt),
    job: run.entityId,
    status: run.action,
    processedCount: payloadValue(run.payload, "processedCount") ?? "0",
    errorMessage: payloadValue(run.payload, "errorMessage") ?? "-",
  }));

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

      <AppFeedback
        messages={[
          {
            tone: "success",
            text: params.job ? `Job ${params.job} ausgeführt. Verarbeitete Einträge: ${params.processed ?? "0"}.` : undefined,
          },
          { tone: "error", text: params.error },
        ]}
      />

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <form action={processNotificationQueueJobAction} className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-medium">Benachrichtigungs-Queue</h3>
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
            Führt Benachrichtigungs-Queue und Wartelistenablauf in einem Wartungslauf aus und protokolliert das Ergebnis.
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
            <SystemJobsDataTable rows={runRows} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
