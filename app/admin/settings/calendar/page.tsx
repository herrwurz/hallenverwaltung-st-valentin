import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import {
  getPublicCalendarVisibilityMode,
  publicCalendarVisibilityModes,
  type PublicCalendarVisibilityMode,
} from "@/lib/services/calendar-settings-service";
import { updateCalendarVisibilitySettingAction } from "@/app/admin/settings/calendar/actions";

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
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Einstellungen</p>
      <h2 className="mt-3 text-3xl font-semibold">Öffentlicher Kalender</h2>
      <p className="mt-3 max-w-3xl text-slate-300">
        Hier wird festgelegt, welche Details die Öffentlichkeit im Kalender sehen darf. Ohne passende Raumfreigabe
        bleibt die sichere Anzeige immer bei belegt oder frei.
      </p>

      <div className="mt-8 flex items-center justify-between gap-4">
        <Link href="/admin/calendar" className="text-sm text-sky-300 hover:text-sky-200">
          Zurück zum Kalender
        </Link>
      </div>

      {saved ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Die Einstellung wurde gespeichert.
        </p>
      ) : null}
      {error ? (
        <p className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{error}</p>
      ) : null}

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="text-xl font-medium">Datenschutzeinstellung</h3>
        <form action={updateCalendarVisibilitySettingAction} className="mt-5 space-y-4">
          {publicCalendarVisibilityModes.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-start gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <input
                type="radio"
                name="mode"
                value={option}
                defaultChecked={mode === option}
                className="mt-1 h-4 w-4 border-slate-600 bg-slate-900 text-sky-500"
              />
              <span>
                <span className="block font-medium">{optionLabels[option].title}</span>
                <span className="mt-1 block text-sm text-slate-400">{optionLabels[option].description}</span>
              </span>
            </label>
          ))}

          <div className="flex justify-end">
            <button className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
              Einstellung speichern
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
