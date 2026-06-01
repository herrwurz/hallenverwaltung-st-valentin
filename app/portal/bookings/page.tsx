import Link from "next/link";
import { AreaShell } from "@/components/area-shell";
import { BuildingRoomSelect } from "@/components/building-room-select";
import { FormActions } from "@/components/form-actions";
import { getBookingStatusBadgeClass, getBookingStatusLabel } from "@/lib/booking-status";
import { getBookingChangeStatusBadgeClass, getBookingChangeStatusLabel, getBookingChangeTypeLabel } from "@/lib/booking-change-status";
import { requirePermission } from "@/lib/permissions";
import { getChangeRequestsForOrganization } from "@/lib/services/booking-change-service";
import { getBookingRequestOptions, getBookingsForOrganization } from "@/lib/services/booking-service";
import { getBookingSeriesForOrganization } from "@/lib/services/booking-series-service";
import { cancelOwnBookingRequestAction, createBookingRequestAction, createBookingSeriesRequestAction, createMoveChangeRequestAction } from "@/app/portal/bookings/actions";

const inputClass = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

type PageProps = {
  searchParams: Promise<{ saved?: string; seriesSaved?: string; cancelled?: string; changeRequested?: string; warning?: string; error?: string }>;
};

export default async function PortalBookingsPage({ searchParams }: PageProps) {
  const user = await requirePermission("REQUEST_BOOKING");
  const [params, options, bookings, changeRequests, series] = await Promise.all([
    searchParams,
    getBookingRequestOptions(user.id),
    getBookingsForOrganization(user.id),
    getChangeRequestsForOrganization(user.id),
    getBookingSeriesForOrganization(user.id),
  ]);

  return (
    <AreaShell
      eyebrow="Portal"
      title="Buchungsantraege"
      description="Neue Einzeltermine beantragen und Antraege Ihrer Organisationen einsehen."
      userName={user.name}
    >
      <div className="mt-8 flex items-center justify-between">
        <Link href="/portal" className="text-sm text-sky-300 hover:text-sky-200">
          Zurueck zum Portal
        </Link>
      </div>

      {params.error ? (
        <p className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{params.error}</p>
      ) : null}
      {params.saved ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Der Buchungsantrag wurde gespeichert.
        </p>
      ) : null}
      {params.seriesSaved ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Der Serienantrag wurde gespeichert.
        </p>
      ) : null}
      {params.cancelled ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Der Buchungsantrag wurde storniert.
        </p>
      ) : null}
      {params.changeRequested ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Der Verschiebungsantrag wurde gespeichert.
        </p>
      ) : null}
      {params.warning ? (
        <p className="mt-4 rounded-lg border border-amber-700 bg-amber-950/40 p-4 text-sm text-amber-200">
          {params.warning}
        </p>
      ) : null}

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-medium">Neuer Buchungsantrag</h2>
        {options.organizations.length === 0 ? (
          <p className="mt-4 text-sm text-amber-200">
            Keine aktive, buchungsberechtigte Organisation ist Ihrem Benutzer zugeordnet.
          </p>
        ) : (
          <form action={createBookingRequestAction} className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="text-sm text-slate-300">
              Organisation
              <select name="organizationId" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Bitte waehlen
                </option>
                {options.organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>
            <BuildingRoomSelect buildings={options.buildings} inputClassName={inputClass} />
            <label className="text-sm text-slate-300">
              Titel
              <input name="title" required maxLength={160} className={inputClass} />
            </label>
            <label className="text-sm text-slate-300">
              Nutzungstyp
              <select name="usageTypeId" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Bitte waehlen
                </option>
                {options.usageTypes.map((usageType) => (
                  <option key={usageType.id} value={usageType.id}>
                    {usageType.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Beginn
              <input name="startsAt" type="datetime-local" required className={inputClass} />
            </label>
            <label className="text-sm text-slate-300">
              Ende
              <input name="endsAt" type="datetime-local" required className={inputClass} />
            </label>
            <label className="text-sm text-slate-300 lg:col-span-2">
              Beschreibung (optional)
              <textarea name="description" rows={3} maxLength={1000} className={inputClass} />
            </label>
            <div className="lg:col-span-2">
              <FormActions submitLabel="Antrag absenden" cancelHref="/portal" />
            </div>
          </form>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-medium">Neuer Serienantrag</h2>
        <p className="mt-2 text-sm text-slate-400">
          Erzeugt woechentliche Einzeltermine. Geschlossene Ferienzeiten und angegebene Ausnahmedaten werden
          uebersprungen.
        </p>
        {options.organizations.length === 0 ? (
          <p className="mt-4 text-sm text-amber-200">
            Keine aktive, buchungsberechtigte Organisation ist Ihrem Benutzer zugeordnet.
          </p>
        ) : (
          <form action={createBookingSeriesRequestAction} className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="text-sm text-slate-300">
              Organisation
              <select name="organizationId" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Bitte waehlen
                </option>
                {options.organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>
            <BuildingRoomSelect buildings={options.buildings} inputClassName={inputClass} />
            <label className="text-sm text-slate-300">
              Titel
              <input name="title" required maxLength={160} className={inputClass} />
            </label>
            <label className="text-sm text-slate-300">
              Nutzungstyp
              <select name="usageTypeId" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Bitte waehlen
                </option>
                {options.usageTypes.map((usageType) => (
                  <option key={usageType.id} value={usageType.id}>
                    {usageType.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Erster Beginn
              <input name="firstStartsAt" type="datetime-local" required className={inputClass} />
            </label>
            <label className="text-sm text-slate-300">
              Erstes Ende
              <input name="firstEndsAt" type="datetime-local" required className={inputClass} />
            </label>
            <label className="text-sm text-slate-300">
              Wiederholen bis
              <input name="repeatUntil" type="date" required className={inputClass} />
            </label>
            <label className="text-sm text-slate-300">
              Beschreibung (optional)
              <input name="description" maxLength={1000} className={inputClass} />
            </label>
            <label className="text-sm text-slate-300 lg:col-span-2">
              Ausnahmedaten (optional, ein Datum pro Zeile)
              <textarea
                name="excludedDates"
                rows={3}
                placeholder="2026-10-26"
                className={inputClass}
              />
            </label>
            <div className="lg:col-span-2">
              <FormActions submitLabel="Serienantrag absenden" cancelHref="/portal" />
            </div>
          </form>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-medium">Antraege Ihrer Organisationen</h2>
        <div className="mt-4 space-y-3">
          {bookings.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
              Noch keine Buchungsantraege vorhanden.
            </p>
          ) : (
            bookings.map((booking) => (
              <article key={booking.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{booking.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {booking.organization.name} | {booking.room.building.name} - {booking.room.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {dateFormatter.format(booking.startsAt)} bis {dateFormatter.format(booking.endsAt)} |{" "}
                      {booking.usageType.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`inline-flex rounded-full px-3 py-1 text-sm ${getBookingStatusBadgeClass(booking.status)}`}>
                      {getBookingStatusLabel(booking.status)}
                    </p>
                    {booking.status === "REQUESTED" && booking.requestedByUserId === user.id ? (
                      <form action={cancelOwnBookingRequestAction} className="mt-3">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <button className="text-sm text-red-300 hover:text-red-200">Antrag stornieren</button>
                      </form>
                    ) : null}
                  </div>
                </div>
                {booking.status === "APPROVED" ? (
                  <form action={createMoveChangeRequestAction} className="mt-5 grid gap-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4 lg:grid-cols-2">
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <p className="text-sm font-medium text-slate-200 lg:col-span-2">Verschiebung beantragen</p>
                    <BuildingRoomSelect
                      buildings={options.buildings}
                      roomName="newRoomId"
                      defaultRoomId={booking.roomId}
                      roomLabel="Neuer Raum"
                      inputClassName={inputClass}
                    />
                    <label className="text-sm text-slate-300">
                      Neuer Beginn
                      <input name="newStartAt" type="datetime-local" required className={inputClass} />
                    </label>
                    <label className="text-sm text-slate-300">
                      Neues Ende
                      <input name="newEndAt" type="datetime-local" required className={inputClass} />
                    </label>
                    <label className="text-sm text-slate-300">
                      Grund
                      <input name="reason" required maxLength={1000} className={inputClass} />
                    </label>
                    <div className="lg:col-span-2">
                      <FormActions submitLabel="Verschiebung beantragen" cancelHref="/portal/bookings" />
                    </div>
                  </form>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-medium">Serien Ihrer Organisationen</h2>
        <div className="mt-4 space-y-3">
          {series.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
              Noch keine Serien vorhanden.
            </p>
          ) : (
            series.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {item.organization.name} | {item.room.building.name} - {item.room.name} | {item.usageType.name}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {dateFormatter.format(item.startsOn)} bis {dateFormatter.format(item.endsOn)} | {item.bookings.length} Termine
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Ganze Serien werden nicht gesammelt geaendert; einzelne Termine koennen ueber Verschiebungsantraege behandelt werden.
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-medium">Verschiebungs- und Tauschantraege</h2>
        <div className="mt-4 space-y-3">
          {changeRequests.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
              Noch keine Aenderungsantraege vorhanden.
            </p>
          ) : (
            changeRequests.map((request) => (
              <article key={request.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <h3 className="font-medium">
                      {getBookingChangeTypeLabel(request.type)}: {request.booking.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Alt: {request.oldRoom.building.name} - {request.oldRoom.name}, {dateFormatter.format(request.oldStartAt)} bis{" "}
                      {dateFormatter.format(request.oldEndAt)}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Neu: {request.newRoom.building.name} - {request.newRoom.name}, {dateFormatter.format(request.newStartAt)} bis{" "}
                      {dateFormatter.format(request.newEndAt)}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">{request.reason}</p>
                  </div>
                  <p className={`inline-flex h-fit rounded-full px-3 py-1 text-sm ${getBookingChangeStatusBadgeClass(request.status)}`}>
                    {getBookingChangeStatusLabel(request.status)}
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </AreaShell>
  );
}
