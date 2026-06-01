import Link from "next/link";
import { StatusFilterSelect } from "@/components/status-filter-select";
import { requirePermission } from "@/lib/permissions";
import { getNotificationsForAdmin } from "@/lib/services/notification-service";
import {
  getNotificationEventSettings,
  notificationEventLabels,
} from "@/lib/services/notification-settings-service";
import {
  processNotificationQueueAction,
  retryNotificationAction,
  updateNotificationEventSettingsAction,
} from "@/app/admin/notifications/actions";
import { notificationEventCodes } from "@/lib/services/notification-types";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusLabels = {
  ALL: "Alle",
  PENDING: "Wartend",
  SENT: "Gesendet",
  FAILED: "Fehlgeschlagen",
} as const;

const statusBadgeClass: Record<"PENDING" | "SENT" | "FAILED", string> = {
  PENDING: "bg-amber-500/20 text-amber-200",
  SENT: "bg-emerald-500/20 text-emerald-200",
  FAILED: "bg-rose-500/20 text-rose-200",
};

type SearchParams = Promise<{
  status?: "ALL" | "PENDING" | "SENT" | "FAILED";
  retried?: string;
  processed?: string;
  settingsSaved?: string;
  error?: string;
}>;

export default async function AdminNotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("VIEW_BOOKINGS");
  const params = await searchParams;
  const selectedStatus =
    params.status === "PENDING" || params.status === "SENT" || params.status === "FAILED" || params.status === "ALL"
      ? params.status
      : "ALL";
  const [notifications, eventSettings] = await Promise.all([
    getNotificationsForAdmin(user.id, selectedStatus),
    getNotificationEventSettings(),
  ]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-400">Benachrichtigungen</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold">Notification Queue</h2>
          <p className="mt-3 max-w-3xl text-slate-300">
            Versandprotokoll für zentrale Buchungs- und Wartelistenereignisse inklusive Fehlerstatus und manuellem
            Retry.
          </p>
        </div>
        <form action={processNotificationQueueAction}>
          <button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
            Queue verarbeiten
          </button>
        </form>
        <Link href="/admin" className="text-sm text-sky-300 hover:text-sky-200">
          Zurück zum Dashboard
        </Link>
      </div>

      {params.retried ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Die Benachrichtigung wurde erneut verarbeitet.
        </p>
      ) : null}
      {params.processed ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Die Queue wurde verarbeitet.
        </p>
      ) : null}
      {params.settingsSaved ? (
        <p className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          Die Event-Schalter wurden gespeichert.
        </p>
      ) : null}
      {params.error ? (
        <p className="mt-6 rounded-lg border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">{params.error}</p>
      ) : null}

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="text-xl font-medium">Event-Schalter</h3>
        <form action={updateNotificationEventSettingsAction} className="mt-5 space-y-3">
          {notificationEventCodes.map((eventCode) => (
            <label
              key={eventCode}
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4"
            >
              <span>
                <span className="block font-medium">{notificationEventLabels[eventCode]}</span>
                <span className="mt-1 block text-sm text-slate-400">{eventCode}</span>
              </span>
              <input
                type="checkbox"
                name={eventCode}
                defaultChecked={eventSettings[eventCode]}
                className="h-5 w-5 rounded border-slate-600 bg-slate-900 text-sky-500"
              />
            </label>
          ))}
          <div className="flex justify-end">
            <button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
              Schalter speichern
            </button>
          </div>
        </form>
      </section>

      <StatusFilterSelect
        selectedValue={selectedStatus}
        options={Object.entries(statusLabels).map(([status, label]) => ({
          value: status,
          label,
        }))}
      />

      <section className="mt-8 space-y-3">
        {notifications.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
            Keine Benachrichtigungen für den gewählten Filter vorhanden.
          </p>
        ) : (
          notifications.map((notification) => {
            const eventLabel =
              notification.eventCode in notificationEventLabels
                ? notificationEventLabels[notification.eventCode as keyof typeof notificationEventLabels]
                : notification.eventCode;

            return (
            <article key={notification.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium">{eventLabel}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Empfänger: {notification.recipientUser?.displayName ?? notification.recipient} ({notification.recipient})
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Erstellt am {dateFormatter.format(notification.createdAt)}
                    {notification.sentAt ? ` | Gesendet am ${dateFormatter.format(notification.sentAt)}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Versuche: {notification.attemptCount}/{notification.maxAttempts}
                    {notification.nextAttemptAt ? ` | Nächster Versuch ab ${dateFormatter.format(notification.nextAttemptAt)}` : ""}
                  </p>
                  {notification.booking ? (
                    <p className="mt-1 text-sm text-slate-400">
                      Buchung: {notification.booking.title} | {notification.booking.organization.name} |{" "}
                      {notification.booking.room.building.name} - {notification.booking.room.name}
                    </p>
                  ) : null}
                  {notification.waitlistEntry ? (
                    <p className="mt-1 text-sm text-slate-400">
                      Warteliste: {notification.waitlistEntry.title} | {notification.waitlistEntry.organization.name} |{" "}
                      {notification.waitlistEntry.room.building.name} - {notification.waitlistEntry.room.name}
                    </p>
                  ) : null}
                  {notification.lastError ?? notification.errorMessage ? (
                    <p className="mt-3 rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
                      {notification.lastError ?? notification.errorMessage}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  {notification.status === "PENDING" || notification.status === "SENT" || notification.status === "FAILED" ? (
                    <span className={`rounded-full px-3 py-1 text-sm ${statusBadgeClass[notification.status]}`}>
                      {statusLabels[notification.status]}
                    </span>
                  ) : null}
                  {notification.status === "FAILED" ? (
                    <form action={retryNotificationAction} className="mt-3">
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <input type="hidden" name="status" value={selectedStatus} />
                      <button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
                        Erneut senden
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </article>
            );
          })
        )}
      </section>
    </>
  );
}
