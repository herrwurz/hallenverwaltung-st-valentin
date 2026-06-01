import { requirePermission } from "@/lib/permissions";
import { getBookingStatusBadgeClass, getBookingStatusLabel } from "@/lib/booking-status";
import { getBookingSeriesForAdmin } from "@/lib/services/booking-series-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminSeriesPage() {
  await requirePermission("VIEW_BOOKINGS");
  const series = await getBookingSeriesForAdmin();

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Serienbuchungen</p>
      <h2 className="mt-3 text-3xl font-semibold">Serienanträge</h2>
      <p className="mt-3 text-slate-300">
        Lesende Übersicht der wöchentlichen Serien. Ganze Serien werden in Version 1 nicht gesammelt geändert;
        einzelne Termine bleiben normale Buchungsanträge im Genehmigungsworkflow.
      </p>

      <section className="mt-8 space-y-3">
        {series.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
            Noch keine Serien vorhanden.
          </p>
        ) : (
          series.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {item.organization.name} | {item.room.building.name} - {item.room.name} | {item.usageType.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {dateFormatter.format(item.startsOn)} bis {dateFormatter.format(item.endsOn)} |{" "}
                    {item.bookings.length} Termine
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.recurrenceRule}</p>
                </div>
              </div>
              {item.bookings.length ? (
                <ul className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                  {item.bookings.map((booking) => (
                    <li key={booking.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span>{dateFormatter.format(booking.startsAt)}</span>
                        <span className={`rounded-full px-2 py-1 text-xs ${getBookingStatusBadgeClass(booking.status)}`}>
                          {getBookingStatusLabel(booking.status)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))
        )}
      </section>
    </>
  );
}
