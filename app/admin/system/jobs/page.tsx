import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { getWorkerJobRuns } from "@/lib/services/worker-service";
import {
  processExpiredWaitlistOffersJobAction,
  processNotificationQueueJobAction,
  runMaintenanceJobsAction,
} from "@/app/admin/system/jobs/actions";

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
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">System</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold">System-Jobs</h2>
          <p className="mt-3 max-w-3xl text-slate-300">
            Manuelle Ausführung der Hintergrundjobs für Benachrichtigungen und Wartelistenangebote. Für den
            Serverbetrieb kann derselbe Ablauf per CLI/Cron gestartet werden.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-sky-300 hover:text-sky-200">
          Zurück zum Dashboard
        </Link>
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
        <form action={processNotificationQueueJobAction} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-lg font-medium">Notification Queue</h3>
          <p className="mt-2 text-sm text-slate-400">
            Verarbeitet fällige PENDING/FAILED E-Mail-Benachrichtigungen unter Beachtung von Backoff und maxAttempts.
          </p>
          <button className="mt-5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
            Queue verarbeiten
          </button>
        </form>

        <form action={processExpiredWaitlistOffersJobAction} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-lg font-medium">Wartelistenablauf</h3>
          <p className="mt-2 text-sm text-slate-400">
            Laesst abgelaufene OFFERED-Einträge auslaufen und aktiviert servicekonform den nächsten passenden Platz.
          </p>
          <button className="mt-5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
            Angebote verarbeiten
          </button>
        </form>

        <form action={runMaintenanceJobsAction} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-lg font-medium">Maintenance</h3>
          <p className="mt-2 text-sm text-slate-400">
            Führt Notification Queue und Wartelistenablauf in einem Wartungslauf aus und protokolliert das Ergebnis.
          </p>
          <button className="mt-5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
            Maintenance ausführen
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="text-xl font-medium">Letzte Ausführungen</h3>
        {runs.length === 0 ? (
          <p className="mt-5 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
            Noch keine Job-Protokolle vorhanden.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-2 pr-4">Zeitpunkt</th>
                  <th className="py-2 pr-4">Job</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Verarbeitet</th>
                  <th className="py-2 pr-4">Fehler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="py-3 pr-4 text-slate-300">{dateFormatter.format(run.createdAt)}</td>
                    <td className="py-3 pr-4 font-medium">{run.entityId}</td>
                    <td className="py-3 pr-4 text-slate-300">{run.action}</td>
                    <td className="py-3 pr-4 text-slate-300">{payloadValue(run.payload, "processedCount") ?? "0"}</td>
                    <td className="py-3 pr-4 text-rose-200">{payloadValue(run.payload, "errorMessage") ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
