import { createHolidayPeriodAction } from "@/app/admin/holidays/actions";
import { requirePermission } from "@/lib/permissions";
import { getHolidayAdministrationData, getHolidayStatusLabel } from "@/lib/services/holiday-service";

const inputClass = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function AdminHolidaysPage({ searchParams }: PageProps) {
  await requirePermission("BLOCK_ROOM");
  const [params, holidays] = await Promise.all([searchParams, getHolidayAdministrationData()]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Ferienlogik</p>
      <h2 className="mt-3 text-3xl font-semibold">Ferien und Feiertage</h2>
      <p className="mt-3 text-slate-300">
        Konfigurierbare Ferien-, Feiertags- und schulautonome Zeiträume für Serienbuchungen. Geschlossene
        Zeiträume werden bei neuen Serienanträgen übersprungen, eingeschränkte Zeiträume als Hinweis angezeigt.
      </p>

      {params.error ? (
        <p className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{params.error}</p>
      ) : null}
      {params.saved ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Ferienzeitraum wurde gespeichert.
        </p>
      ) : null}

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-lg font-medium">Zeitraum erfassen</h3>
        <form action={createHolidayPeriodAction} className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="text-sm text-slate-300">
            Name
            <input name="name" required maxLength={160} className={inputClass} />
          </label>
          <label className="text-sm text-slate-300">
            Status
            <select name="defaultStatus" required defaultValue="CLOSED" className={inputClass}>
              <option value="OPEN">Geöffnet</option>
              <option value="RESTRICTED">Eingeschränkt</option>
              <option value="CLOSED">Gesperrt</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Beginn
            <input name="startsOn" type="datetime-local" required className={inputClass} />
          </label>
          <label className="text-sm text-slate-300">
            Ende
            <input name="endsOn" type="datetime-local" required className={inputClass} />
          </label>
          <label className="text-sm text-slate-300 lg:col-span-2">
            Grund
            <textarea name="reason" rows={3} required maxLength={1000} className={inputClass} />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-300 lg:col-span-2">
            <input name="isPublic" type="checkbox" defaultChecked className="rounded border-slate-700 bg-slate-950" />
            Für Benutzer sichtbar
          </label>
          <div className="lg:col-span-2 lg:text-right">
            <button className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
              Zeitraum speichern
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8 space-y-3">
        {holidays.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
            Noch keine Ferien- oder Feiertagszeitraeume vorhanden.
          </p>
        ) : (
          holidays.map((holiday) => (
            <article key={holiday.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <h3 className="font-medium">{holiday.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {dateFormatter.format(holiday.startsOn)} bis {dateFormatter.format(holiday.endsOn)}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">{holiday.reason}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium text-sky-200">{getHolidayStatusLabel(holiday.defaultStatus)}</p>
                  <p className="mt-1 text-slate-500">{holiday.isPublic ? "Sichtbar" : "Intern"}</p>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </>
  );
}
