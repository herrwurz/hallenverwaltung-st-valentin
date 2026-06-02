import { AppBackLink } from "@/components/app-back-link";
import { AppFeedback } from "@/components/app-feedback";
import { AreaShell } from "@/components/area-shell";
import { BuildingRoomSelect } from "@/components/building-room-select";
import { FormActions } from "@/components/form-actions";
import { PortalBookingsTable, type PortalBookingTableRow } from "@/components/portal-bookings-table";
import { PortalOrganizationField } from "@/components/portal-organization-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBookingChangeStatusBadgeClass, getBookingChangeStatusLabel, getBookingChangeTypeLabel } from "@/lib/booking-change-status";
import { getBookingStatusBadgeClass, getBookingStatusLabel } from "@/lib/booking-status";
import { requirePermission } from "@/lib/permissions";
import { getChangeRequestsForOrganization } from "@/lib/services/booking-change-service";
import { getBookingRequestOptions, getBookingsForOrganization } from "@/lib/services/booking-service";
import { getBookingSeriesForOrganization } from "@/lib/services/booking-series-service";
import {
  cancelOwnBookingRequestAction,
  createBookingRequestAction,
  createBookingSeriesRequestAction,
  createMoveChangeRequestAction,
} from "@/app/portal/bookings/actions";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

type PageProps = {
  searchParams: Promise<{
    saved?: string;
    seriesSaved?: string;
    cancelled?: string;
    changeRequested?: string;
    warning?: string;
    error?: string;
  }>;
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
  const bookingRows: PortalBookingTableRow[] = bookings.map((booking) => ({
    id: booking.id,
    title: booking.title,
    organizationName: booking.organization.name,
    buildingName: booking.room.building.name,
    roomName: booking.room.name,
    usageTypeName: booking.usageType.name,
    startsAtLabel: dateFormatter.format(booking.startsAt),
    endsAtLabel: dateFormatter.format(booking.endsAt),
    status: booking.status,
  }));
  const approvedBookings = bookings.filter((booking) => booking.status === "APPROVED");

  return (
    <AreaShell
      eyebrow="Portal"
      title="Buchungsanträge"
      description="Neue Einzeltermine beantragen und Anträge Ihrer Organisationen einsehen."
      userName={user.name}
    >
      <div className="mt-8 flex items-center justify-between">
        <AppBackLink href="/portal" label="Zurück zum Portal" />
      </div>

      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          { tone: "success", text: params.saved ? "Der Buchungsantrag wurde gespeichert." : undefined },
          { tone: "success", text: params.seriesSaved ? "Der Serienantrag wurde gespeichert." : undefined },
          { tone: "success", text: params.cancelled ? "Der Buchungsantrag wurde storniert." : undefined },
          { tone: "success", text: params.changeRequested ? "Der Verschiebungsantrag wurde gespeichert." : undefined },
          { tone: "warning", text: params.warning },
        ]}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Neuer Buchungsantrag</CardTitle>
          <CardDescription>Einzeltermin mit Organisation, Raum, Nutzungstyp und Zeitraum beantragen.</CardDescription>
        </CardHeader>
        <CardContent>
          {options.organizations.length === 0 ? (
            <p className="text-sm text-warning-foreground">
              Keine aktive, buchungsberechtigte Organisation ist Ihrem Benutzer zugeordnet.
            </p>
          ) : (
            <form action={createBookingRequestAction} className="grid gap-4 lg:grid-cols-2">
              <PortalOrganizationField organizations={options.organizations} inputClassName={inputClass} />
              <BuildingRoomSelect buildings={options.buildings} inputClassName={inputClass} />
              <label className="text-sm font-medium">
                Titel
                <input name="title" required maxLength={160} className={inputClass} />
              </label>
              <label className="text-sm font-medium">
                Nutzungstyp
                <select name="usageTypeId" required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    Bitte wählen
                  </option>
                  {options.usageTypes.map((usageType) => (
                    <option key={usageType.id} value={usageType.id}>
                      {usageType.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Beginn
                <input name="startsAt" type="datetime-local" required className={inputClass} />
              </label>
              <label className="text-sm font-medium">
                Ende
                <input name="endsAt" type="datetime-local" required className={inputClass} />
              </label>
              <label className="text-sm font-medium lg:col-span-2">
                Beschreibung (optional)
                <textarea name="description" rows={3} maxLength={1000} className={inputClass} />
              </label>
              <div className="lg:col-span-2">
                <FormActions submitLabel="Antrag absenden" cancelHref="/portal" />
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Neuer Serienantrag</CardTitle>
          <CardDescription>
            Erzeugt wöchentliche Einzeltermine. Geschlossene Ferienzeiten und angegebene Ausnahmedaten werden übersprungen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {options.organizations.length === 0 ? (
            <p className="text-sm text-warning-foreground">
              Keine aktive, buchungsberechtigte Organisation ist Ihrem Benutzer zugeordnet.
            </p>
          ) : (
            <form action={createBookingSeriesRequestAction} className="grid gap-4 lg:grid-cols-2">
              <PortalOrganizationField organizations={options.organizations} inputClassName={inputClass} />
              <BuildingRoomSelect buildings={options.buildings} inputClassName={inputClass} />
              <label className="text-sm font-medium">
                Titel
                <input name="title" required maxLength={160} className={inputClass} />
              </label>
              <label className="text-sm font-medium">
                Nutzungstyp
                <select name="usageTypeId" required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    Bitte wählen
                  </option>
                  {options.usageTypes.map((usageType) => (
                    <option key={usageType.id} value={usageType.id}>
                      {usageType.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Erster Beginn
                <input name="firstStartsAt" type="datetime-local" required className={inputClass} />
              </label>
              <label className="text-sm font-medium">
                Erstes Ende
                <input name="firstEndsAt" type="datetime-local" required className={inputClass} />
              </label>
              <label className="text-sm font-medium">
                Wiederholen bis
                <input name="repeatUntil" type="date" required className={inputClass} />
              </label>
              <label className="text-sm font-medium">
                Beschreibung (optional)
                <input name="description" maxLength={1000} className={inputClass} />
              </label>
              <label className="text-sm font-medium lg:col-span-2">
                Ausnahmedaten (optional, ein Datum pro Zeile)
                <textarea name="excludedDates" rows={3} placeholder="2026-10-26" className={inputClass} />
              </label>
              <div className="lg:col-span-2">
                <FormActions submitLabel="Serienantrag absenden" cancelHref="/portal" />
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Anträge Ihrer Organisationen</CardTitle>
          <CardDescription>Filterbare Übersicht aller eigenen Buchungsanträge.</CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Noch keine Buchungsanträge vorhanden.
            </p>
          ) : (
            <PortalBookingsTable rows={bookingRows} />
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Stornieren und Verschieben</CardTitle>
          <CardDescription>
            Beantragte eigene Termine können storniert werden. Genehmigte Termine erhalten einen Verschiebungsantrag.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bookings.filter((booking) => booking.status === "REQUESTED" && booking.requestedByUserId === user.id).map((booking) => (
            <form key={booking.id} action={cancelOwnBookingRequestAction} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-4">
              <input type="hidden" name="bookingId" value={booking.id} />
              <div>
                <p className="font-medium">{booking.title}</p>
                <p className="text-sm text-muted-foreground">
                  {booking.room.building.name} - {booking.room.name} | {dateFormatter.format(booking.startsAt)}
                </p>
              </div>
              <Button variant="destructive" size="sm">Antrag stornieren</Button>
            </form>
          ))}
          {approvedBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine genehmigten Termine für Verschiebungsanträge vorhanden.</p>
          ) : (
            approvedBookings.map((booking) => (
              <form key={booking.id} action={createMoveChangeRequestAction} className="grid gap-4 rounded-xl border border-border bg-card p-4 lg:grid-cols-2">
                <input type="hidden" name="bookingId" value={booking.id} />
                <p className="text-sm font-medium lg:col-span-2">
                  Verschiebung beantragen: {booking.title}{" "}
                  <span className={`ml-2 rounded-full px-2 py-1 text-xs ${getBookingStatusBadgeClass(booking.status)}`}>
                    {getBookingStatusLabel(booking.status)}
                  </span>
                </p>
                <BuildingRoomSelect
                  buildings={options.buildings}
                  roomName="newRoomId"
                  defaultRoomId={booking.roomId}
                  roomLabel="Neuer Raum"
                  inputClassName={inputClass}
                />
                <label className="text-sm font-medium">
                  Neuer Beginn
                  <input name="newStartAt" type="datetime-local" required className={inputClass} />
                </label>
                <label className="text-sm font-medium">
                  Neues Ende
                  <input name="newEndAt" type="datetime-local" required className={inputClass} />
                </label>
                <label className="text-sm font-medium">
                  Grund
                  <input name="reason" required maxLength={1000} className={inputClass} />
                </label>
                <div className="lg:col-span-2">
                  <FormActions submitLabel="Verschiebung beantragen" cancelHref="/portal/bookings" />
                </div>
              </form>
            ))
          )}
        </CardContent>
      </Card>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Serien Ihrer Organisationen</CardTitle>
            <CardDescription>Serien erzeugen Einzeltermine, die einzeln den Genehmigungsworkflow durchlaufen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {series.length === 0 ? (
              <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
                Noch keine Serien vorhanden.
              </p>
            ) : (
              series.map((item) => (
                <article key={item.id} className="rounded-xl border border-border bg-card p-4">
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.organization.name} | {item.room.building.name} - {item.room.name} | {item.usageType.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {dateFormatter.format(item.startsOn)} bis {dateFormatter.format(item.endsOn)} | {item.bookings.length} Termine
                  </p>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verschiebungs- und Tauschanträge</CardTitle>
            <CardDescription>Lesende Übersicht laufender Änderungsanträge.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {changeRequests.length === 0 ? (
              <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
                Noch keine Änderungsanträge vorhanden.
              </p>
            ) : (
              changeRequests.map((request) => (
                <article key={request.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap justify-between gap-4">
                    <div>
                      <h3 className="font-medium">
                        {getBookingChangeTypeLabel(request.type)}: {request.booking.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Alt: {request.oldRoom.building.name} - {request.oldRoom.name}, {dateFormatter.format(request.oldStartAt)} bis{" "}
                        {dateFormatter.format(request.oldEndAt)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Neu: {request.newRoom.building.name} - {request.newRoom.name}, {dateFormatter.format(request.newStartAt)} bis{" "}
                        {dateFormatter.format(request.newEndAt)}
                      </p>
                      <p className="mt-2 text-sm">{request.reason}</p>
                    </div>
                    <p className={`inline-flex h-fit rounded-full px-3 py-1 text-sm ${getBookingChangeStatusBadgeClass(request.status)}`}>
                      {getBookingChangeStatusLabel(request.status)}
                    </p>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </AreaShell>
  );
}
