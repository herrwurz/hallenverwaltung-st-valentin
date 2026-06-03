import { acceptWaitlistOfferAction, createWaitlistEntryAction, declineWaitlistOfferAction } from "@/app/portal/waitlist/actions";
import { AppBackLink } from "@/components/app-back-link";
import { AppFeedback } from "@/components/app-feedback";
import { AreaShell } from "@/components/area-shell";
import { BuildingRoomSelect } from "@/components/building-room-select";
import { FormActions } from "@/components/form-actions";
import { PortalOrganizationField } from "@/components/portal-organization-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/permissions";
import { getBookingRequestOptions } from "@/lib/services/booking-service";
import { getWaitlistForOrganization } from "@/lib/services/waitlist-service";
import { getWaitlistStatusBadgeClass, getWaitlistStatusLabel } from "@/lib/waitlist-status";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

type PageProps = {
  searchParams: Promise<{ saved?: string; accepted?: string; declined?: string; error?: string }>;
};

export default async function PortalWaitlistPage({ searchParams }: PageProps) {
  const user = await requirePermission("REQUEST_BOOKING");
  const [params, options, entries] = await Promise.all([
    searchParams,
    getBookingRequestOptions(user.id),
    getWaitlistForOrganization(user.id),
  ]);

  return (
    <AreaShell
      eyebrow="Portal"
      title="Warteliste"
      description="Wartelistenplätze für gefragte Zeitfenster anlegen und Angebote innerhalb von 48 Stunden bearbeiten."
      userName={user.name}
    >
      <div className="mt-8 flex items-center justify-between">
        <AppBackLink href="/portal" label="Zurück zum Portal" />
      </div>

      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          { tone: "success", text: params.saved ? "Der Wartelistenplatz wurde gespeichert." : undefined },
          {
            tone: "success",
            text: params.accepted ? "Das Angebot wurde angenommen und als neuer Buchungsantrag angelegt." : undefined,
          },
          { tone: "success", text: params.declined ? "Das Angebot wurde abgelehnt." : undefined },
        ]}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Neuer Wartelistenplatz</CardTitle>
          <CardDescription>Wunschzeitraum vormerken. Ein Angebot erzeugt später nur einen neuen Antrag, keine fixe Buchung.</CardDescription>
        </CardHeader>
        <CardContent>
          {options.organizations.length === 0 ? (
            <p className="text-sm text-warning-foreground">
              Keine aktive, wartelistenberechtigte Organisation ist Ihrem Benutzer zugeordnet.
            </p>
          ) : (
            <form action={createWaitlistEntryAction} className="grid gap-4 lg:grid-cols-2">
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
              <div className="lg:col-span-2">
                <FormActions submitLabel="Wartelistenplatz anlegen" cancelHref="/portal" />
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Wartelistenplätze Ihrer Organisationen</CardTitle>
          <CardDescription>Reihung, Angebotsfrist und Aktionen in einer kompakten Tabellenansicht.</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Noch keine Wartelistenplätze vorhanden.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Titel</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Gebäude / Raum</TableHead>
                    <TableHead>Zeitraum</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.title}</TableCell>
                      <TableCell>{entry.organization.name}</TableCell>
                      <TableCell>
                        <p>{entry.room.building.name}</p>
                        <p className="text-xs text-muted-foreground">{entry.room.name}</p>
                      </TableCell>
                      <TableCell>
                        <p>{dateFormatter.format(entry.startsAt)}</p>
                        <p className="text-xs text-muted-foreground">bis {dateFormatter.format(entry.endsAt)}</p>
                        {entry.offerExpiresAt ? (
                          <p className="mt-1 text-xs text-warning-foreground">Frist bis {dateFormatter.format(entry.offerExpiresAt)}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getWaitlistStatusBadgeClass(entry.status)}`}>
                          {getWaitlistStatusLabel(entry.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.status === "OFFERED" ? (
                          <div className="flex justify-end gap-2">
                            <form action={acceptWaitlistOfferAction}>
                              <input type="hidden" name="waitlistEntryId" value={entry.id} />
                              <Button size="sm" variant="success">Annehmen</Button>
                            </form>
                            <form action={declineWaitlistOfferAction}>
                              <input type="hidden" name="waitlistEntryId" value={entry.id} />
                              <Button size="sm" variant="outline">Ablehnen</Button>
                            </form>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Keine Aktion</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AreaShell>
  );
}
