import Link from "next/link";
import { AppBackLink } from "@/components/app-back-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/permissions";
import {
  getDailyOccupancyReport,
  getMonthlyOverviewReport,
  getOrganizationOverviewReport,
  getReportFilterOptions,
  getWeeklyPlanReport,
  type PrintReportBookingRow,
  type PrintReportClosureRow,
  type PrintReportType,
} from "@/lib/services/print-report-service";
import type { BookingStatus } from "@prisma/client";

const reportLabels: Record<PrintReportType, string> = {
  daily: "Tagesbelegung",
  weekly: "Wochenplan",
  monthly: "Monatsübersicht",
  organization: "Vereinsübersicht",
};

const statusLabels: Record<BookingStatus, string> = {
  DRAFT: "Entwurf",
  REQUESTED: "Beantragt",
  IN_REVIEW: "In Prüfung",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
  CANCELLED: "Storniert",
  MOVED: "Verschoben",
  ARCHIVED: "Archiviert",
};

const reportStatusOptions: BookingStatus[] = ["REQUESTED", "IN_REVIEW", "APPROVED"];

const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });
const weekdayFormatter = new Intl.DateTimeFormat("de-AT", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

type SearchParams = Promise<{
  report?: string;
  periodStart?: string;
  periodEnd?: string;
  organizationId?: string;
  buildingId?: string;
  roomId?: string;
  status?: string;
}>;

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = next.getUTCDay() || 7;
  next.setUTCDate(next.getUTCDate() - day + 1);
  return next;
}

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

function parseReportType(value: string | undefined): PrintReportType {
  return value === "weekly" || value === "monthly" || value === "organization" ? value : "daily";
}

function parseStatus(value: string | undefined) {
  return reportStatusOptions.includes(value as BookingStatus) ? (value as BookingStatus) : undefined;
}

function buildPrintHref(params: Awaited<SearchParams>, report: PrintReportType, periodStart: Date, periodEnd: Date, roomId?: string) {
  const query = new URLSearchParams({
    report,
    periodStart: formatInputDate(periodStart),
    periodEnd: formatInputDate(periodEnd),
  });

  for (const key of ["organizationId", "buildingId", "status"] as const) {
    if (params[key]) {
      query.set(key, params[key]);
    }
  }

  if (roomId) {
    query.set("roomId", roomId);
  }

  return `/admin/reports/print?${query.toString()}`;
}

function defaultPeriod(report: PrintReportType) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (report === "weekly") {
    const start = startOfWeek(today);
    return { start, end: addDays(start, 6) };
  }

  if (report === "monthly") {
    return {
      start: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
      end: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)),
    };
  }

  if (report === "organization") {
    return {
      start: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
      end: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)),
    };
  }

  return { start: today, end: today };
}

function getBadgeVariant(status: BookingStatus) {
  if (status === "APPROVED") {
    return "success" as const;
  }

  if (status === "REQUESTED" || status === "IN_REVIEW") {
    return "warning" as const;
  }

  return "secondary" as const;
}

function BookingRows({ rows }: { rows: PrintReportBookingRow[] }) {
  if (rows.length === 0) {
    return <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">Keine Buchungen im Zeitraum.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Zeit</TableHead>
          <TableHead>Organisation</TableHead>
          <TableHead>Gebäude / Raum</TableHead>
          <TableHead>Nutzung</TableHead>
          <TableHead>Titel</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <p>{dateTimeFormatter.format(row.startsAt)}</p>
              <p className="text-xs text-muted-foreground">bis {dateTimeFormatter.format(row.endsAt)}</p>
            </TableCell>
            <TableCell>{row.organizationName}</TableCell>
            <TableCell>
              <p>{row.buildingName}</p>
              <p className="text-xs text-muted-foreground">{row.roomName}</p>
            </TableCell>
            <TableCell>{row.usageTypeName}</TableCell>
            <TableCell>{row.title}</TableCell>
            <TableCell>
              <Badge variant={getBadgeVariant(row.status)}>{statusLabels[row.status]}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ClosureRows({ rows }: { rows: PrintReportClosureRow[] }) {
  if (rows.length === 0) {
    return <p className="rounded-xl border border-border bg-muted p-5 text-sm text-muted-foreground">Keine Sperren im Zeitraum.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Zeit</TableHead>
          <TableHead>Bereich</TableHead>
          <TableHead>Grund</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <p>{dateTimeFormatter.format(row.startsAt)}</p>
              <p className="text-xs text-muted-foreground">bis {dateTimeFormatter.format(row.endsAt)}</p>
            </TableCell>
            <TableCell>{row.roomName ? `${row.buildingName} - ${row.roomName}` : row.buildingName}</TableCell>
            <TableCell>{row.reason}</TableCell>
            <TableCell>
              <Badge variant={row.status === "CLOSED" ? "destructive" : "warning"}>{row.status === "CLOSED" ? "Gesperrt" : "Eingeschränkt"}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function AdminReportsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("VIEW_BOOKINGS");

  const params = await searchParams;
  const report = parseReportType(params.report);
  const defaults = defaultPeriod(report);
  const periodStart = parseDateInput(params.periodStart, defaults.start);
  const periodEnd = parseDateInput(params.periodEnd, defaults.end);
  const status = parseStatus(params.status);
  const filterOptions = await getReportFilterOptions();
  const visibleRooms = params.buildingId
    ? filterOptions.rooms.filter((room) => room.buildingId === params.buildingId)
    : filterOptions.rooms;
  const roomId = visibleRooms.some((room) => room.id === params.roomId) ? params.roomId : undefined;
  const filter = {
    periodStart,
    periodEnd: addDays(periodEnd, 1),
    organizationId: params.organizationId,
    buildingId: params.buildingId,
    roomId,
    status,
  };

  const [dailyReport, weeklyReport, monthlyReport, organizationReport] = await Promise.all([
    report === "daily" ? getDailyOccupancyReport(filter) : Promise.resolve(null),
    report === "weekly" ? getWeeklyPlanReport(filter) : Promise.resolve(null),
    report === "monthly" ? getMonthlyOverviewReport(filter) : Promise.resolve(null),
    report === "organization" ? getOrganizationOverviewReport(filter) : Promise.resolve(null),
  ]);

  return (
    <>
      <div className="print:hidden">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Berichte</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Druckberichte</h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Tagesbelegung, Wochenplan, Monatsübersicht und Vereinsübersicht für Ausdrucke, Aushänge und interne Abstimmung.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={buildPrintHref(params, report, periodStart, periodEnd, roomId)}>Druckansicht</Link>
            </Button>
            <AppBackLink href="/admin" label="Zurück zum Dashboard" />
          </div>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Filter</CardTitle>
            <CardDescription>Berichtstyp, Zeitraum und optionale Einschränkungen auswählen.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-[1fr,1fr,1fr,1fr,1fr,1fr,1fr,auto]" action="/admin/reports">
              <label className="text-sm font-medium">
                Bericht
                <select name="report" defaultValue={report} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 shadow-sm">
                  {Object.entries(reportLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Von
                <input type="date" name="periodStart" defaultValue={formatInputDate(periodStart)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 shadow-sm" />
              </label>
              <label className="text-sm font-medium">
                Bis
                <input type="date" name="periodEnd" defaultValue={formatInputDate(periodEnd)} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 shadow-sm" />
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
                <select name="roomId" defaultValue={roomId ?? ""} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 shadow-sm">
                  <option value="">Alle</option>
                  {visibleRooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.buildingName} - {room.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Status
                <select name="status" defaultValue={params.status ?? ""} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 shadow-sm">
                  <option value="">Beantragt, in Prüfung, genehmigt</option>
                  {reportStatusOptions.map((option) => (
                    <option key={option} value={option}>{statusLabels[option]}</option>
                  ))}
                </select>
              </label>
              <Button className="self-end">Anzeigen</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8 space-y-8 print:mt-0">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm print:border-0 print:p-0 print:shadow-none">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary print:text-slate-700">Hallenverwaltung St. Valentin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{reportLabels[report]}</h1>
          <p className="mt-2 text-sm text-muted-foreground print:text-slate-700">
            Zeitraum: {dateFormatter.format(periodStart)} bis {dateFormatter.format(periodEnd)}
          </p>
        </div>

        {dailyReport ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Buchungen</CardTitle>
                <CardDescription>Alle relevanten Buchungen des Tages.</CardDescription>
              </CardHeader>
              <CardContent><BookingRows rows={dailyReport.bookings} /></CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Sperren</CardTitle>
                <CardDescription>Raum- und Gebäudesperren im Zeitraum.</CardDescription>
              </CardHeader>
              <CardContent><ClosureRows rows={dailyReport.closures} /></CardContent>
            </Card>
          </>
        ) : null}

        {weeklyReport ? (
          <div className="grid gap-4">
            {weeklyReport.days.map((day) => (
              <Card key={day.date} className="break-inside-avoid">
                <CardHeader>
                  <CardTitle>{weekdayFormatter.format(new Date(`${day.date}T00:00:00.000Z`))}</CardTitle>
                  <CardDescription>{day.bookings.length} Buchungen, {day.closures.length} Sperren</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <BookingRows rows={day.bookings} />
                  <ClosureRows rows={day.closures} />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {monthlyReport ? (
          <Card>
            <CardHeader>
              <CardTitle>Monatliche Tagesübersicht</CardTitle>
              <CardDescription>Kompakter Überblick für den gewählten Zeitraum.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Buchungen</TableHead>
                    <TableHead>Genehmigt</TableHead>
                    <TableHead>Beantragt</TableHead>
                    <TableHead>In Prüfung</TableHead>
                    <TableHead>Sperren</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyReport.days.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>{weekdayFormatter.format(new Date(`${day.date}T00:00:00.000Z`))}</TableCell>
                      <TableCell>{day.bookingCount}</TableCell>
                      <TableCell>{day.approvedCount}</TableCell>
                      <TableCell>{day.requestedCount}</TableCell>
                      <TableCell>{day.inReviewCount}</TableCell>
                      <TableCell>{day.closureCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        {organizationReport ? (
          <div className="grid gap-4">
            {organizationReport.organizations.map((organization) => (
              <Card key={organization.id} className="break-inside-avoid">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle>{organization.name}</CardTitle>
                      <CardDescription>{organization.typeName} | Status: {organization.status}</CardDescription>
                    </div>
                    <Badge variant="outline">{organization.bookings.length} Buchungen</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold">Kontakte</h3>
                    {organization.contacts.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">Keine Kontakte hinterlegt.</p>
                    ) : (
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        {organization.contacts.map((contact) => (
                          <div key={`${organization.id}-${contact.name}-${contact.function}`} className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                            <p className="font-medium">{contact.name} {contact.isPrimary ? "(Hauptkontakt)" : ""}</p>
                            <p className="text-muted-foreground">{contact.function}</p>
                            <p>{contact.email ?? "Keine E-Mail"} | {contact.phone ?? "Kein Telefon"}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Buchungen im Zeitraum</h3>
                    <BookingRows rows={organization.bookings} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </section>

      <div className="mt-8 print:hidden">
        <Button variant="outline" asChild>
          <Link href="/admin">Zurück zum Dashboard</Link>
        </Button>
      </div>
    </>
  );
}
