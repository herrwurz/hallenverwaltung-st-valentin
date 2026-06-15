import { processNotificationQueueAction, retryNotificationAction } from "@/app/admin/notifications/actions";
import { AppBackLink } from "@/components/app-back-link";
import { AppFeedback } from "@/components/app-feedback";
import { NotificationsTable, type NotificationTableRow } from "@/components/admin-notifications-table";
import { StatusFilterSelect } from "@/components/status-filter-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import { getNotificationsForAdmin } from "@/lib/services/notification-service";
import { notificationEventLabels } from "@/lib/services/notification-settings-service";

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

type SearchParams = Promise<{
  status?: "ALL" | "PENDING" | "SENT" | "FAILED";
  retried?: string;
  processed?: string;
  error?: string;
}>;

export default async function AdminNotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("VIEW_BOOKINGS");
  const params = await searchParams;
  const selectedStatus =
    params.status === "PENDING" || params.status === "SENT" || params.status === "FAILED" || params.status === "ALL"
      ? params.status
      : "ALL";
  const notifications = await getNotificationsForAdmin(user.id, selectedStatus);
  const rows: NotificationTableRow[] = notifications
    .filter((notification) => notification.status === "PENDING" || notification.status === "SENT" || notification.status === "FAILED")
    .map((notification) => {
      const eventLabel =
        notification.eventCode in notificationEventLabels
          ? notificationEventLabels[notification.eventCode as keyof typeof notificationEventLabels]
          : notification.eventCode;
      const reference = notification.booking
        ? `Buchung: ${notification.booking.title} | ${notification.booking.organization.name} | ${notification.booking.room.building.name} - ${notification.booking.room.name}`
        : notification.waitlistEntry
          ? `Warteliste: ${notification.waitlistEntry.title} | ${notification.waitlistEntry.organization.name} | ${notification.waitlistEntry.room.building.name} - ${notification.waitlistEntry.room.name}`
          : "-";

      return {
        id: notification.id,
        eventLabel,
        recipient: `${notification.recipientUser?.displayName ?? notification.recipient} (${notification.recipient})`,
        reference,
        createdAtLabel: dateFormatter.format(notification.createdAt),
        sentAtLabel: notification.sentAt ? dateFormatter.format(notification.sentAt) : "-",
        attempts: `${notification.attemptCount}/${notification.maxAttempts}`,
        nextAttemptAtLabel: notification.nextAttemptAt ? dateFormatter.format(notification.nextAttemptAt) : "-",
        status: notification.status,
        lastError: notification.lastError ?? notification.errorMessage ?? "-",
      };
    });

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Benachrichtigungen</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Benachrichtigungs-Queue</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Versandprotokoll für zentrale Buchungs- und Wartelistenereignisse inklusive Fehlerstatus und manuellem Retry.
            SMTP und Benachrichtigungsregeln werden unter Einstellungen gepflegt.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form action={processNotificationQueueAction}>
            <Button>Queue verarbeiten</Button>
          </form>
          <AppBackLink href="/admin/settings/mail" label="Mail-Einstellungen" />
          <AppBackLink href="/admin" label="Zurück zum Dashboard" />
        </div>
      </div>

      <AppFeedback
        messages={[
          { tone: "success", text: params.retried ? "Die Benachrichtigung wurde erneut verarbeitet." : undefined },
          { tone: "success", text: params.processed ? "Die Queue wurde verarbeitet." : undefined },
          { tone: "error", text: params.error },
        ]}
      />

      <StatusFilterSelect
        selectedValue={selectedStatus}
        options={Object.entries(statusLabels).map(([status, label]) => ({
          value: status,
          label,
        }))}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Queue-Einträge</CardTitle>
          <CardDescription>Filterbare Liste gesendeter, wartender und fehlgeschlagener Benachrichtigungen.</CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Keine Benachrichtigungen für den gewählten Filter vorhanden.
            </p>
          ) : (
            <NotificationsTable rows={rows} />
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Fehlgeschlagene erneut senden</CardTitle>
          <CardDescription>Retry bleibt serverseitig über die bestehende Action abgesichert.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.filter((notification) => notification.status === "FAILED").length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine fehlgeschlagenen Benachrichtigungen im aktuellen Filter.</p>
          ) : (
            notifications
              .filter((notification) => notification.status === "FAILED")
              .map((notification) => (
                <form key={notification.id} action={retryNotificationAction} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-4">
                  <input type="hidden" name="notificationId" value={notification.id} />
                  <input type="hidden" name="status" value={selectedStatus} />
                  <div>
                    <p className="font-medium">{notification.recipient}</p>
                    <p className="text-sm text-muted-foreground">{notification.lastError ?? notification.errorMessage}</p>
                  </div>
                  <Button size="sm">Erneut senden</Button>
                </form>
              ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
