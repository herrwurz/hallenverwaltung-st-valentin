import Link from "next/link";
import { createBillingEntriesAction, markBillingEntriesExportedAction } from "@/app/admin/billing/actions";
import { AppBackLink } from "@/components/app-back-link";
import {
  BillableBookingsTable,
  BillingEntriesTable,
  type BillableBookingTableRow,
  type BillingEntryTableRow,
} from "@/components/admin-billing-tables";
import { AppFeedback } from "@/components/app-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import { getBillableBookings } from "@/lib/services/billing-service";
import { getBillingFilterOptions, getBillingReportData } from "@/lib/services/reporting-service";

const dateFormatter = new Intl.DateTimeFormat("de-AT", {
  dateStyle: "medium",
  timeStyle: "short",
});

const currencyFormatter = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
});

const statusLabels = {
  NOT_RELEVANT: "Nicht relevant",
  OPEN: "Offen",
  EXPORTED: "Exportiert",
  BILLED: "Abgerechnet",
  CANCELLED: "Storniert",
} as const;

type SearchParams = Promise<{
  periodStart?: string;
  periodEnd?: string;
  created?: string;
  skipped?: string;
  exported?: string;
  error?: string;
  organizationId?: string;
  buildingId?: string;
  roomId?: string;
  status?: string;
}>;

function formatInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateInput(value: string | undefined, fallback: Date) {
  if (!value) {
    return fallback;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function parseEndDateInput(value: string | undefined, fallback: Date) {
  if (!value) {
    return fallback;
  }

  const date = parseDateInput(value, fallback);
  return addDays(date, 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function money(value: { toString(): string } | null) {
  return currencyFormatter.format(Number(value?.toString() ?? 0));
}

function exportParams({
  periodStart,
  periodEnd,
  params,
  format,
  report,
}: {
  periodStart: Date;
  periodEnd: Date;
  params: Awaited<SearchParams>;
  format: string;
  report?: string;
}) {
  const query = new URLSearchParams({
    format,
    periodStart: formatInputDate(periodStart),
    periodEnd: formatInputDate(addDays(periodEnd, -1)),
  });

  for (const key of ["organizationId", "buildingId", "roomId", "status"] as const) {
    if (params[key]) {
      query.set(key, params[key]);
    }
  }

  if (report) {
    query.set("report", report);
  }

  return `/admin/billing/export?${query.toString()}`;
}

export default async function AdminBillingPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("BILLING_EXPORT");
  const params = await searchParams;
  const now = new Date();
  const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const periodStart = parseDateInput(params.periodStart, defaultStart);
  const periodEnd = parseEndDateInput(params.periodEnd, defaultEnd);
  const status = Object.keys(statusLabels).includes(params.status ?? "") ? (params.status as keyof typeof statusLabels) : undefined;
  const [bookings, entries, filterOptions] = await Promise.all([
    getBillableBookings({ periodStart, periodEnd }),
    getBillingReportData({
      periodStart,
      periodEnd,
      organizationId: params.organizationId,
      buildingId: params.buildingId,
      roomId: params.roomId,
      status,
    }),
    getBillingFilterOptions(),
  ]);
  const openEntries = entries.filter((entry) => entry.status === "OPEN");
  const billableRows: BillableBookingTableRow[] = bookings.map((booking) => ({
    id: booking.id,
    startsAtLabel: dateFormatter.format(booking.startsAt),
    title: booking.title,
    organizationName: booking.organization.name,
    roomName: `${booking.room.building.name} - ${booking.room.name}`,
    usageTypeName: booking.usageType.name,
  }));
  const entryRows: BillingEntryTableRow[] = entries.map((entry) => ({
    id: entry.id,
    periodStartLabel: dateFormatter.format(entry.periodStart),
    bookingTitle: entry.bookingTitle,
    organizationName: entry.organizationName,
    tariffName: entry.tariffName,
    calculation: `${entry.calculationType} | ${entry.durationMinutes} Min. | ${money({ toString: () => entry.unitPrice })}`,
    amountLabel: money({ toString: () => entry.amount }),
    status: entry.status,
    statusLabel: statusLabels[entry.status],
  }));

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Abrechnung</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Abrechnungsvorbereitung</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Genehmigte Buchungen werden gesammelt, tarifiert und für einen späteren Excel- oder PDF-Export vorbereitet.
            Es wird keine Rechnung erzeugt und keine Zahlung verarbeitet.
          </p>
        </div>
        <AppBackLink href="/admin" label="Zurück zum Dashboard" />
      </div>

      <AppFeedback
        messages={[
          { tone: "error", text: params.error },
          {
            tone: "success",
            text: params.created ? `${params.created} Abrechnungseinträge erzeugt. ${params.skipped ?? "0"} Buchungen wurden übersprungen.` : undefined,
          },
          { tone: "info", text: params.exported ? `${params.exported} Einträge wurden als exportiert markiert.` : undefined },
        ]}
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>Zeitraum und optionale Filter für Organisation, Gebäude, Raum und Status.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[1fr,1fr,1fr,1fr,1fr,1fr,auto]" action="/admin/billing">
            <label className="text-sm font-medium">
              Von
              <input type="date" name="periodStart" defaultValue={formatInputDate(periodStart)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 shadow-sm" />
            </label>
            <label className="text-sm font-medium">
              Bis
              <input type="date" name="periodEnd" defaultValue={formatInputDate(addDays(periodEnd, -1))} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 shadow-sm" />
            </label>
            <label className="text-sm font-medium">
              Organisation
              <select name="organizationId" defaultValue={params.organizationId ?? ""} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 shadow-sm">
                <option value="">Alle</option>
                {filterOptions.organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Gebäude
              <select name="buildingId" defaultValue={params.buildingId ?? ""} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 shadow-sm">
                <option value="">Alle</option>
                {filterOptions.buildings.map((building) => (
                  <option key={building.id} value={building.id}>{building.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Raum
              <select name="roomId" defaultValue={params.roomId ?? ""} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 shadow-sm">
                <option value="">Alle</option>
                {filterOptions.rooms.map((room) => (
                  <option key={room.id} value={room.id}>{room.buildingName} - {room.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Status
              <select name="status" defaultValue={params.status ?? ""} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 shadow-sm">
                <option value="">Alle</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <Button className="self-end">Anzeigen</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Abrechnungsfähige Buchungen</CardTitle>
              <CardDescription>Nur genehmigte Buchungen ohne bestehenden Eintrag.</CardDescription>
            </div>
            <form action={createBillingEntriesAction}>
              <input type="hidden" name="periodStart" value={formatInputDate(periodStart)} />
              <input type="hidden" name="periodEnd" value={formatInputDate(periodEnd)} />
              <Button>Einträge erzeugen</Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Keine offenen abrechnungsfähigen Buchungen im Zeitraum.
            </p>
          ) : (
            <BillableBookingsTable rows={billableRows} />
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Abrechnungseinträge</CardTitle>
              <CardDescription>Erzeugte Einträge können exportiert oder als exportiert markiert werden.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={exportParams({ periodStart, periodEnd, params, format: "csv" })}>CSV</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={exportParams({ periodStart, periodEnd, params, format: "xlsx" })}>XLSX</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={exportParams({ periodStart, periodEnd, params, format: "pdf", report: "monthly" })}>PDF Monat</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={exportParams({ periodStart, periodEnd, params, format: "pdf", report: "organization" })}>PDF Vereine</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={exportParams({ periodStart, periodEnd, params, format: "pdf", report: "roomUsage" })}>PDF Räume</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={`${exportParams({ periodStart, periodEnd, params, format: "csv" })}&markExported=1`}>
                  CSV + exportiert
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">
              Noch keine Abrechnungseinträge im Zeitraum.
            </p>
          ) : (
            <>
              <BillingEntriesTable rows={entryRows} />
              <form action={markBillingEntriesExportedAction} className="mt-6 space-y-4 rounded-xl border border-border bg-muted/40 p-4">
                <input type="hidden" name="periodStart" value={formatInputDate(periodStart)} />
                <input type="hidden" name="periodEnd" value={formatInputDate(periodEnd)} />
                <p className="text-sm text-muted-foreground">
                  Offene Einträge können zusätzlich manuell als exportiert markiert werden.
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {openEntries.map((entry) => (
                    <label key={entry.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
                      <input type="checkbox" name="entryIds" value={entry.id} />
                      {entry.bookingTitle} | {money({ toString: () => entry.amount })}
                    </label>
                  ))}
                </div>
                <Button disabled={openEntries.length === 0}>Ausgewählte als exportiert markieren</Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
