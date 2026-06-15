import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
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

function defaultPeriod(report: PrintReportType) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (report === "monthly" || report === "organization") {
    return {
      start: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
      end: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)),
    };
  }

  if (report === "weekly") {
    return { start: today, end: addDays(today, 6) };
  }

  return { start: today, end: today };
}

function rangeLabel(periodStart: Date, periodEnd: Date) {
  return `${dateFormatter.format(periodStart)} bis ${dateFormatter.format(periodEnd)}`;
}

function compactDateTime(start: Date, end: Date) {
  if (formatInputDate(start) === formatInputDate(end)) {
    return `${dateFormatter.format(start)}, ${new Intl.DateTimeFormat("de-AT", { timeStyle: "short" }).format(start)}-${new Intl.DateTimeFormat("de-AT", { timeStyle: "short" }).format(end)}`;
  }

  return `${dateTimeFormatter.format(start)} bis ${dateTimeFormatter.format(end)}`;
}

function BookingTable({ rows }: { rows: PrintReportBookingRow[] }) {
  if (rows.length === 0) {
    return <p className="print-empty">Keine Buchungen im Zeitraum.</p>;
  }

  return (
    <table className="print-table">
      <thead>
        <tr>
          <th>Zeit</th>
          <th>Organisation</th>
          <th>Gebäude / Raum</th>
          <th>Nutzung</th>
          <th>Titel</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{compactDateTime(row.startsAt, row.endsAt)}</td>
            <td>{row.organizationName}</td>
            <td>{row.buildingName} / {row.roomName}</td>
            <td>{row.usageTypeName}</td>
            <td>{row.title}</td>
            <td>{statusLabels[row.status]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ClosureTable({ rows }: { rows: PrintReportClosureRow[] }) {
  if (rows.length === 0) {
    return <p className="print-empty">Keine Sperren im Zeitraum.</p>;
  }

  return (
    <table className="print-table">
      <thead>
        <tr>
          <th>Zeit</th>
          <th>Bereich</th>
          <th>Grund</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{compactDateTime(row.startsAt, row.endsAt)}</td>
            <td>{row.roomName ? `${row.buildingName} / ${row.roomName}` : row.buildingName}</td>
            <td>{row.reason}</td>
            <td>{row.status === "CLOSED" ? "Gesperrt" : "Eingeschränkt"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PrintStyles() {
  return (
    <style>{`
      @page { size: A4; margin: 12mm; }
      @media print {
        body { background: #fff !important; }
        .windows-shell { background: #fff !important; }
      }
      .print-report {
        max-width: 1120px;
        margin: 0 auto;
        background: #fff;
        color: #111827;
        font-family: "Segoe UI", Arial, sans-serif;
      }
      .print-actions {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .print-header {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 1rem;
        border-bottom: 2px solid #1d4ed8;
        padding-bottom: 0.6rem;
        margin-bottom: 1rem;
      }
      .print-kicker {
        color: #1d4ed8;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      .print-header h1 {
        margin: 0.2rem 0 0;
        font-size: 1.55rem;
      }
      .print-meta {
        text-align: right;
        font-size: 0.78rem;
        color: #374151;
      }
      .print-section {
        break-inside: avoid;
        margin-top: 1rem;
      }
      .print-section h2 {
        margin: 0 0 0.4rem;
        font-size: 1rem;
        border-bottom: 1px solid #cbd5e1;
        padding-bottom: 0.2rem;
      }
      .print-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.76rem;
      }
      .print-table th,
      .print-table td {
        border: 1px solid #cbd5e1;
        padding: 0.25rem 0.35rem;
        vertical-align: top;
      }
      .print-table th {
        background: #e2e8f0;
        font-weight: 700;
        text-align: left;
      }
      .print-empty {
        border: 1px solid #cbd5e1;
        color: #475569;
        font-size: 0.8rem;
        padding: 0.45rem;
      }
      .print-day {
        break-inside: avoid;
        margin-bottom: 0.8rem;
      }
      .print-contact-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.35rem;
        margin-bottom: 0.6rem;
      }
      .print-contact {
        border: 1px solid #cbd5e1;
        padding: 0.35rem;
        font-size: 0.76rem;
      }
      @media print {
        .print-actions { display: none; }
        .print-report { max-width: none; margin: 0; }
        .print-table { font-size: 8.8pt; }
        .print-header h1 { font-size: 17pt; }
      }
    `}</style>
  );
}

export default async function AdminReportsPrintPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("VIEW_BOOKINGS");

  const params = await searchParams;
  const report = parseReportType(params.report);
  const defaults = defaultPeriod(report);
  const periodStart = parseDateInput(params.periodStart, defaults.start);
  const periodEnd = parseDateInput(params.periodEnd, defaults.end);
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
    status: parseStatus(params.status),
  };

  const [dailyReport, weeklyReport, monthlyReport, organizationReport] = await Promise.all([
    report === "daily" ? getDailyOccupancyReport(filter) : Promise.resolve(null),
    report === "weekly" ? getWeeklyPlanReport(filter) : Promise.resolve(null),
    report === "monthly" ? getMonthlyOverviewReport(filter) : Promise.resolve(null),
    report === "organization" ? getOrganizationOverviewReport(filter) : Promise.resolve(null),
  ]);

  return (
    <main className="print-report">
      <PrintStyles />
      <div className="print-actions print:hidden">
        <Button variant="outline" asChild>
          <Link href="/admin/reports">Zurück zu den Berichten</Link>
        </Button>
        <PrintButton label="Jetzt drucken" />
      </div>

      <header className="print-header">
        <div>
          <p className="print-kicker">Hallenverwaltung St. Valentin</p>
          <h1>{reportLabels[report]}</h1>
        </div>
        <div className="print-meta">
          <p>Zeitraum: {rangeLabel(periodStart, periodEnd)}</p>
          <p>Erstellt: {dateTimeFormatter.format(new Date())}</p>
        </div>
      </header>

      {dailyReport ? (
        <>
          <section className="print-section">
            <h2>Buchungen</h2>
            <BookingTable rows={dailyReport.bookings} />
          </section>
          <section className="print-section">
            <h2>Sperren</h2>
            <ClosureTable rows={dailyReport.closures} />
          </section>
        </>
      ) : null}

      {weeklyReport ? (
        <section className="print-section">
          <h2>Wochenplan</h2>
          {weeklyReport.days.map((day) => (
            <div key={day.date} className="print-day">
              <h3>{weekdayFormatter.format(new Date(`${day.date}T00:00:00.000Z`))}</h3>
              <BookingTable rows={day.bookings} />
              {day.closures.length > 0 ? <ClosureTable rows={day.closures} /> : null}
            </div>
          ))}
        </section>
      ) : null}

      {monthlyReport ? (
        <section className="print-section">
          <h2>Monatsübersicht</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Buchungen</th>
                <th>Genehmigt</th>
                <th>Beantragt</th>
                <th>In Prüfung</th>
                <th>Sperren</th>
              </tr>
            </thead>
            <tbody>
              {monthlyReport.days.map((day) => (
                <tr key={day.date}>
                  <td>{weekdayFormatter.format(new Date(`${day.date}T00:00:00.000Z`))}</td>
                  <td>{day.bookingCount}</td>
                  <td>{day.approvedCount}</td>
                  <td>{day.requestedCount}</td>
                  <td>{day.inReviewCount}</td>
                  <td>{day.closureCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {organizationReport ? (
        <section className="print-section">
          <h2>Vereinsübersicht</h2>
          {organizationReport.organizations.map((organization) => (
            <div key={organization.id} className="print-day">
              <h3>{organization.name}</h3>
              <p>{organization.typeName} | Status: {organization.status} | Buchungen: {organization.bookings.length}</p>
              {organization.contacts.length > 0 ? (
                <div className="print-contact-grid">
                  {organization.contacts.map((contact) => (
                    <div key={`${organization.id}-${contact.name}-${contact.function}`} className="print-contact">
                      <strong>{contact.name}{contact.isPrimary ? " (Hauptkontakt)" : ""}</strong>
                      <br />
                      {contact.function}
                      <br />
                      {contact.email ?? "Keine E-Mail"} | {contact.phone ?? "Kein Telefon"}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="print-empty">Keine Kontakte hinterlegt.</p>
              )}
              <BookingTable rows={organization.bookings} />
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
