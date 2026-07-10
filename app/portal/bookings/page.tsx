import type { ReactNode } from "react";
import { AppBackLink } from "@/components/app-back-link";
import { AppFeedback } from "@/components/app-feedback";
import { AreaShell } from "@/components/area-shell";
import { BookingRequestForm } from "@/components/booking-request-form";
import { BuildingRoomSelect } from "@/components/building-room-select";
import { ModalFormActions } from "@/components/dialog-form-actions";
import { PortalBookingManager } from "@/components/portal-booking-manager";
import type { PortalBookingTableRow } from "@/components/portal-bookings-table";
import { SeriesRequestForm } from "@/components/series-request-form";
import { SingleDayTimeRangeFields } from "@/components/single-day-time-range-fields";
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

  const noOrganizationHint = (
    <p className="text-sm text-warning-foreground">
      Keine aktive, buchungsberechtigte Organisation ist Ihrem Benutzer zugeordnet.
    </p>
  );

  // Detail-Inhalt je Buchung wird serverseitig gerendert und dem Client-Manager
  // als React-Children uebergeben (Server Actions bleiben dadurch in der Page).
  const detailContent: Record<string, ReactNode> = {};
  for (const booking of bookings) {
    const canCancel = booking.status === "REQUESTED" && booking.requestedByUserId === user.id;
    const canMove = booking.status === "APPROVED";

    detailContent[booking.id] = (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {booking.organization.name} | {booking.room.building.name} - {booking.room.name} | {booking.usageType.name}
          </p>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm leading-none ${getBookingStatusBadgeClass(booking.status)}`}>
            {getBookingStatusLabel(booking.status)}
          </span>
        </div>
        <p className="text-sm font-medium">
          {dateFormatter.format(booking.startsAt)} bis {dateFormatter.format(booking.endsAt)}
        </p>

        {canCancel ? (
          <form action={cancelOwnBookingRequestAction} className="rounded-xl border border-rose-500/20 bg-muted/40 p-4">
            <input type="hidden" name="bookingId" value={booking.id} />
            <p className="text-sm text-muted-foreground">Der eigene beantragte Termin kann storniert werden.</p>
            <Button variant="destructive" size="sm" className="mt-3">
              Antrag stornieren
            </Button>
          </form>
        ) : null}

        {canMove ? (
          <form action={createMoveChangeRequestAction} className="grid gap-4 rounded-xl border border-border bg-muted/40 p-4 sm:grid-cols-2">
            <input type="hidden" name="bookingId" value={booking.id} />
            <p className="text-sm font-medium sm:col-span-2">Verschiebung beantragen</p>
            <BuildingRoomSelect
              buildings={options.buildings}
              roomName="newRoomId"
              defaultRoomId={booking.roomId}
              roomLabel="Neuer Raum"
              inputClassName={inputClass}
            />
            <SingleDayTimeRangeFields
              startName="newStartAt"
              endName="newEndAt"
              startLabel="Neuer Beginn"
              endLabel="Neues Ende"
              hint="Verschobene Termine enden am selben Tag wie der neue Beginn."
              inputClassName={inputClass}
            />
            <label className="text-sm font-medium">
              Grund
              <input name="reason" required maxLength={1000} className={inputClass} />
            </label>
            <div className="sm:col-span-2">
              <ModalFormActions submitLabel="Verschiebung beantragen" />
            </div>
          </form>
        ) : null}

        {!canCancel && !canMove ? (
          <p className="rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
            Für diesen Antrag sind aktuell keine Aktionen möglich. Beantragte eigene Termine können storniert werden,
            genehmigte Termine erhalten einen Verschiebungsantrag.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <AreaShell
      eyebrow="Portal"
      title="Buchungsanträge"
      description="Neue Einzeltermine oder Serien beantragen und Anträge Ihrer Organisationen einsehen. Ein Klick auf eine Zeile öffnet Details und Aktionen."
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

      <PortalBookingManager
        rows={bookingRows}
        detailContent={detailContent}
        errorText={params.error}
        newBookingForm={
          options.organizations.length === 0 ? (
            noOrganizationHint
          ) : (
            <BookingRequestForm
              action={createBookingRequestAction}
              organizations={options.organizations}
              buildings={options.buildings}
              usageTypes={options.usageTypes}
              inputClassName={inputClass}
              inModal
            />
          )
        }
        newSeriesForm={
          options.organizations.length === 0 ? (
            noOrganizationHint
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">
                Erzeugt täglich, wöchentlich, monatlich oder jährlich wiederkehrende Einzeltermine — auch mehrtägig
                oder ganztägig. Geschlossene Ferienzeiten und angegebene Ausnahmedaten werden übersprungen.
              </p>
              <SeriesRequestForm
                action={createBookingSeriesRequestAction}
                organizations={options.organizations}
                buildings={options.buildings}
                usageTypes={options.usageTypes}
                inputClassName={inputClass}
                inModal
              />
            </div>
          )
        }
      />

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
