import { recordHandoverEventAction } from "@/app/admin/handovers/actions";
import { requirePermission } from "@/lib/permissions";
import {
  getAdminHandoverData,
  getHandoverActionLabel,
  getHandoverStatus,
  getHandoverStatusLabel,
  type HandoverAction,
} from "@/lib/services/handover-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });
const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

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
      <h2 className="mt-3 text-3xl font-semibold">Hallenübergaben</h2>
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

      <section className="mt-8 space-y-3">
        {data.bookings.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Aktuell sind keine genehmigten Buchungen für Hallenübergaben vorhanden.
          </p>
        ) : (
          data.bookings.map((booking) => {
            const status = getHandoverStatus(booking.handover);
            const nextAction = nextActions[status];

            return (
              <article key={booking.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{booking.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {booking.organization.name} | {booking.room.building.name} - {booking.room.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {dateFormatter.format(booking.startsAt)} bis {dateFormatter.format(booking.endsAt)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Nutzung: {booking.usageType.name}</p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-sm text-slate-200">
                    {getHandoverStatusLabel(status)}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                  <div>
                    <dt className="text-slate-500">Schlüssel erhalten</dt>
                    <dd>{booking.handover?.keyReceivedAt ? dateFormatter.format(booking.handover.keyReceivedAt) : "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Halle übernommen</dt>
                    <dd>{booking.handover?.roomAcceptedAt ? dateFormatter.format(booking.handover.roomAcceptedAt) : "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Halle retourniert</dt>
                    <dd>{booking.handover?.roomReturnedAt ? dateFormatter.format(booking.handover.roomReturnedAt) : "-"}</dd>
                  </div>
                </dl>

                {booking.handover?.notes ? <p className="mt-3 text-sm text-muted-foreground">{booking.handover.notes}</p> : null}

                {nextAction ? (
                  <form action={recordHandoverEventAction} className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input type="hidden" name="action" value={nextAction} />
                    <label className="text-sm text-muted-foreground">
                      Notiz optional
                      <textarea name="notes" rows={2} maxLength={2000} className={inputClass} />
                    </label>
                    <div className="self-end">
                      <button className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                        {getHandoverActionLabel(nextAction)}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="mt-5 text-sm text-emerald-300">Übergabe abgeschlossen.</p>
                )}
              </article>
            );
          })
        )}
      </section>
    </>
  );
}
