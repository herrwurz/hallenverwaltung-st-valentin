import { recordHandoverEventAction } from "@/app/admin/handovers/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/permissions";
import {
  getAdminHandoverData,
  getHandoverActionLabel,
  getHandoverStatus,
  getHandoverStatusLabel,
  type HandoverAction,
} from "@/lib/services/handover-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });
const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

const nextActions: Record<ReturnType<typeof getHandoverStatus>, HandoverAction | null> = {
  OPEN: "KEY_RECEIVED",
  KEY_RECEIVED: "ROOM_ACCEPTED",
  ROOM_ACCEPTED: "ROOM_RETURNED",
  ROOM_RETURNED: null,
};

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function AdminHandoversPage({ searchParams }: PageProps) {
  const user = await requirePermission("MANAGE_HANDOVERS");
  const params = await searchParams;
  const data = await getAdminHandoverData(user.id);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Hallenwart</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Hallenübergaben</h2>
      <p className="mt-3 text-muted-foreground">
        Schlüsselerhalt, Hallenübernahme und Retournierung für genehmigte Buchungen erfassen. Die Buchung selbst wird
        dadurch nicht verändert.
      </p>

      {!data.canViewAll ? (
        <p className="mt-4 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Es werden nur Buchungen für Räume oder Gebäude angezeigt, denen dein Hallenwart-Profil zugeordnet ist.
        </p>
      ) : null}

      {params.error ? (
        <p className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{params.error}</p>
      ) : null}
      {params.saved ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Hallenübergabe wurde aktualisiert.
        </p>
      ) : null}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Genehmigte Buchungen</CardTitle>
          <CardDescription>Übergabestatus je Buchung mit nächstem zulässigem Schritt.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.bookings.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Aktuell sind keine genehmigten Buchungen für Hallenübergaben vorhanden.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Buchung</TableHead>
                    <TableHead>Gebäude / Raum</TableHead>
                    <TableHead>Zeitraum</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Übergabezeiten</TableHead>
                    <TableHead>Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.bookings.map((booking) => {
                    const status = getHandoverStatus(booking.handover);
                    const nextAction = nextActions[status];

                    return (
                      <TableRow key={booking.id} className="align-top">
                        <TableCell>
                          <p className="font-medium">{booking.title}</p>
                          <p className="text-xs text-muted-foreground">{booking.organization.name}</p>
                          <p className="text-xs text-muted-foreground">Nutzung: {booking.usageType.name}</p>
                        </TableCell>
                        <TableCell>
                          <p>{booking.room.building.name}</p>
                          <p className="text-xs text-muted-foreground">{booking.room.name}</p>
                        </TableCell>
                        <TableCell>
                          <p>{dateFormatter.format(booking.startsAt)}</p>
                          <p className="text-xs text-muted-foreground">bis {dateFormatter.format(booking.endsAt)}</p>
                        </TableCell>
                        <TableCell>
                          <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">
                            {getHandoverStatusLabel(status)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <p>Schlüssel: {booking.handover?.keyReceivedAt ? dateFormatter.format(booking.handover.keyReceivedAt) : "-"}</p>
                          <p>Übernahme: {booking.handover?.roomAcceptedAt ? dateFormatter.format(booking.handover.roomAcceptedAt) : "-"}</p>
                          <p>Retour: {booking.handover?.roomReturnedAt ? dateFormatter.format(booking.handover.roomReturnedAt) : "-"}</p>
                          {booking.handover?.notes ? <p className="mt-2">{booking.handover.notes}</p> : null}
                        </TableCell>
                        <TableCell>
                          {nextAction ? (
                            <form action={recordHandoverEventAction} className="min-w-64 space-y-2">
                              <input type="hidden" name="bookingId" value={booking.id} />
                              <input type="hidden" name="action" value={nextAction} />
                              <label className="text-xs font-medium">
                                Notiz optional
                                <textarea name="notes" rows={2} maxLength={2000} className={inputClass} />
                              </label>
                              <Button size="sm">{getHandoverActionLabel(nextAction)}</Button>
                            </form>
                          ) : (
                            <span className="text-sm text-success">Übergabe abgeschlossen.</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
