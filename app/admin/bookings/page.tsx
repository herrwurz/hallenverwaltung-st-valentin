import { requirePermission } from "@/lib/permissions";
import { getBookingsForAdmin } from "@/lib/services/booking-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminBookingsPage() {
  await requirePermission("VIEW_BOOKINGS");
  const bookings = await getBookingsForAdmin();

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Buchungen</p>
      <h2 className="mt-3 text-3xl font-semibold">Buchungsantraege</h2>
      <p className="mt-3 text-slate-300">
        Lesende Uebersicht der eingegangenen Antraege. Entscheidungen folgen in einer spaeteren Phase.
      </p>
      <section className="mt-8 space-y-3">
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
                  <p className="mt-1 text-sm text-slate-500">
                    Beantragt von {booking.requestedBy?.displayName ?? "Unbekannt"}
                  </p>
                </div>
                <span className="text-sm text-sky-300">{booking.status}</span>
              </div>
            </article>
          ))
        )}
      </section>
    </>
  );
}
