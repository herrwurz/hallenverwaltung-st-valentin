import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { getBillableBookings, getBillingEntries } from "@/lib/services/billing-service";
import {
  createBillingEntriesAction,
  markBillingEntriesExportedAction,
} from "@/app/admin/billing/actions";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

const currencyFormatter = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
});

const statusLabels = {
  NOT_RELEVANT: "Nicht relevant",
  OPEN: "Offen",
  EXPORTED: "Exportiert",
  BILLED: "Abgerechnet",
  CANCELLED: "Storniert",
} as const;

type SearchParams = Promise<{
  periodStart?: string;
  periodEnd?: string;
  created?: string;
  skipped?: string;
  exported?: string;
  error?: string;
}>;

function formatInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateInput(value: string | undefined, fallback: Date) {
  if (!value) {
    return fallback;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function parseEndDateInput(value: string | undefined, fallback: Date) {
  if (!value) {
    return fallback;
  }

  const date = parseDateInput(value, fallback);
  return addDays(date, 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function money(value: { toString(): string } | null) {
  return currencyFormatter.format(Number(value?.toString() ?? 0));
}

export default async function AdminBillingPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("CREATE_EXPORTS");
  const params = await searchParams;
  const now = new Date();
  const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const periodStart = parseDateInput(params.periodStart, defaultStart);
  const periodEnd = parseEndDateInput(params.periodEnd, defaultEnd);
  const [bookings, entries] = await Promise.all([
    getBillableBookings({ periodStart, periodEnd }),
    getBillingEntries({ periodStart, periodEnd }),
  ]);
  const openEntries = entries.filter((entry) => entry.status === "OPEN");

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Abrechnung</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold">Abrechnungsvorbereitung</h2>
          <p className="mt-3 max-w-3xl text-slate-300">
            Genehmigte Buchungen werden gesammelt, tarifiert und fuer einen spaeteren Excel- oder PDF-Export
            vorbereitet. Es wird keine Rechnung erzeugt und keine Zahlung verarbeitet.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-sky-300 hover:text-sky-200">
          Zurueck zum Dashboard
        </Link>
      </div>

      {params.error ? (
        <p className="mt-6 rounded-lg border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">{params.error}</p>
      ) : null}
      {params.created ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          {params.created} Abrechnungseintraege erzeugt. {params.skipped ?? "0"} Buchungen wurden uebersprungen.
        </p>
      ) : null}
      {params.exported ? (
        <p className="mt-6 rounded-lg border border-sky-800 bg-sky-950/40 p-4 text-sm text-sky-200">
          {params.exported} Eintraege wurden als exportiert markiert.
        </p>
      ) : null}

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="text-xl font-medium">Zeitraum</h3>
        <form className="mt-5 grid gap-4 md:grid-cols-[1fr,1fr,auto]" action="/admin/billing">
          <label className="text-sm text-slate-300">
            Von
            <input
              type="date"
              name="periodStart"
              defaultValue={formatInputDate(periodStart)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-300">
            Bis
            <input
              type="date"
              name="periodEnd"
              defaultValue={formatInputDate(addDays(periodEnd, -1))}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            />
          </label>
          <button className="self-end rounded-lg bg-slate-700 px-5 py-2 text-sm font-medium text-white hover:bg-slate-600">
            Anzeigen
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-medium">Abrechnungsfaehige Buchungen</h3>
            <p className="mt-2 text-sm text-slate-400">Nur genehmigte Buchungen ohne bestehenden Eintrag.</p>
          </div>
          <form action={createBillingEntriesAction}>
            <input type="hidden" name="periodStart" value={formatInputDate(periodStart)} />
            <input type="hidden" name="periodEnd" value={formatInputDate(periodEnd)} />
            <button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
              Eintraege erzeugen
            </button>
          </form>
        </div>

        {bookings.length === 0 ? (
          <p className="mt-5 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
            Keine offenen abrechnungsfaehigen Buchungen im Zeitraum.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-2 pr-4">Termin</th>
                  <th className="py-2 pr-4">Buchung</th>
                  <th className="py-2 pr-4">Organisation</th>
                  <th className="py-2 pr-4">Raum</th>
                  <th className="py-2 pr-4">Nutzung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="py-3 pr-4 text-slate-300">{dateFormatter.format(booking.startsAt)}</td>
                    <td className="py-3 pr-4 font-medium">{booking.title}</td>
                    <td className="py-3 pr-4 text-slate-300">{booking.organization.name}</td>
                    <td className="py-3 pr-4 text-slate-300">
                      {booking.room.building.name} - {booking.room.name}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">{booking.usageType.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-medium">Abrechnungseintraege</h3>
            <p className="mt-2 text-sm text-slate-400">Erzeugte Eintraege koennen als exportiert markiert werden.</p>
          </div>
        </div>

        {entries.length === 0 ? (
          <p className="mt-5 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
            Noch keine Abrechnungseintraege im Zeitraum.
          </p>
        ) : (
          <form action={markBillingEntriesExportedAction} className="mt-5">
            <input type="hidden" name="periodStart" value={formatInputDate(periodStart)} />
            <input type="hidden" name="periodEnd" value={formatInputDate(periodEnd)} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="py-2 pr-4">Export</th>
                    <th className="py-2 pr-4">Termin</th>
                    <th className="py-2 pr-4">Buchung</th>
                    <th className="py-2 pr-4">Organisation</th>
                    <th className="py-2 pr-4">Tarif</th>
                    <th className="py-2 pr-4">Berechnung</th>
                    <th className="py-2 pr-4">Betrag</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-3 pr-4">
                        {entry.status === "OPEN" ? (
                          <input type="checkbox" name="entryIds" value={entry.id} className="h-4 w-4" />
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-slate-300">{dateFormatter.format(entry.periodStart)}</td>
                      <td className="py-3 pr-4 font-medium">{entry.booking.title}</td>
                      <td className="py-3 pr-4 text-slate-300">{entry.organization.name}</td>
                      <td className="py-3 pr-4 text-slate-300">{entry.tariff?.name ?? "Kein Tarif"}</td>
                      <td className="py-3 pr-4 text-slate-300">
                        {entry.calculationType} | {entry.durationMinutes} Min. | {money(entry.unitPrice)}
                      </td>
                      <td className="py-3 pr-4 font-medium">{money(entry.amount)}</td>
                      <td className="py-3 pr-4 text-slate-300">{statusLabels[entry.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              disabled={openEntries.length === 0}
              className="mt-5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              Ausgewaehlte als exportiert markieren
            </button>
          </form>
        )}
      </section>
    </>
  );
}
