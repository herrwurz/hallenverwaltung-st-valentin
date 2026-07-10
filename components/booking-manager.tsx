"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarCheck, ChevronRight, Repeat } from "lucide-react";
import {
  approveBookingAction,
  approveSeriesAction,
  markBookingInReviewAction,
  markSeriesInReviewAction,
  rejectBookingAction,
  rejectSeriesAction,
} from "@/app/admin/bookings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getBookingStatusBadgeClass, getBookingStatusLabel } from "@/lib/booking-status";

const textareaClass = "mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

export type BookingConflictView = {
  severity: "blocking" | "soft";
  type: string;
  message: string;
};

export type BookingHistoryView = {
  id: string;
  changeLabel: string;
  metaLabel: string;
  reason: string | null;
};

export type BookingView = {
  id: string;
  title: string;
  description: string | null;
  usageTypeName: string;
  organizationName: string;
  buildingName: string;
  roomName: string;
  startsAtLabel: string;
  endsAtLabel: string;
  status: BookingStatus;
  conflicts: BookingConflictView[];
  history: BookingHistoryView[];
};

export type BookingManagerItem =
  | { kind: "single"; booking: BookingView }
  | {
      kind: "series";
      seriesId: string;
      seriesTitle: string;
      organizationName: string;
      buildingName: string;
      roomName: string;
      usageTypeName: string;
      bookings: BookingView[];
    };

export type BookingFilterValues = {
  status: string;
  organizationId: string;
  buildingId: string;
  roomId: string;
};

type BookingManagerProps = {
  items: BookingManagerItem[];
  filters: BookingFilterValues;
  canApprove: boolean;
  canReject: boolean;
  errorText?: string;
};

type BookingTableRow = {
  key: string;
  kind: "single" | "series";
  refId: string;
  title: string;
  usageTypeName: string;
  organizationName: string;
  buildingName: string;
  roomName: string;
  timeLabel: string;
  timeDetailLabel: string;
  status: BookingStatus | null;
  itemCount: number;
  openCount: number;
  conflictCount: number;
  hasBlockingConflict: boolean;
};

function isOpenStatus(status: BookingStatus) {
  return status === "REQUESTED" || status === "IN_REVIEW";
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
      <p className="text-2xl font-semibold leading-none tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusBadge({ status, small }: { status: BookingStatus; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full leading-none ${small ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"} ${getBookingStatusBadgeClass(status)}`}
    >
      {getBookingStatusLabel(status)}
    </span>
  );
}

const columns: ColumnDef<BookingTableRow>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Titel
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.original.kind === "series" ? `Serie · ${row.original.usageTypeName}` : row.original.usageTypeName}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "organizationName",
    header: "Organisation",
  },
  {
    accessorKey: "buildingName",
    header: "Gebäude / Raum",
    cell: ({ row }) => (
      <div>
        <p>{row.original.buildingName}</p>
        <p className="text-xs text-muted-foreground">{row.original.roomName}</p>
      </div>
    ),
  },
  {
    accessorKey: "timeLabel",
    header: "Zeitraum",
    cell: ({ row }) => (
      <div className="min-w-60">
        {row.original.timeLabel}
        <br />
        <span className="text-xs text-muted-foreground">{row.original.timeDetailLabel}</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) =>
      row.original.kind === "series" ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{row.original.itemCount} Termine</Badge>
          {row.original.openCount > 0 ? <Badge variant="warning">{row.original.openCount} offen</Badge> : null}
        </div>
      ) : row.original.status ? (
        <StatusBadge status={row.original.status} small />
      ) : null,
  },
  {
    accessorKey: "conflictCount",
    header: "Konflikte",
    cell: ({ row }) => (
      <Badge variant={row.original.hasBlockingConflict ? "destructive" : row.original.conflictCount ? "warning" : "success"}>
        {row.original.conflictCount}
      </Badge>
    ),
  },
  {
    id: "open",
    header: "",
    cell: () => <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />,
  },
];

export function BookingManager({ items, filters, canApprove, canReject, errorText }: BookingManagerProps) {
  const searchParams = useSearchParams();
  const savedMarker = searchParams.get("ts");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{ kind: "single" | "series"; refId: string } | null>(null);
  const [closedForMarker, setClosedForMarker] = useState<string | null>(null);

  // Nach erfolgreicher Entscheidung (neuer "ts"-Marker in der URL) den Dialog
  // schliessen. Anpassung waehrend des Renderns statt in einem Effect, siehe
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (savedMarker && savedMarker !== closedForMarker) {
    setClosedForMarker(savedMarker);
    setOpen(false);
  }

  const allBookings = items.flatMap((item) => (item.kind === "single" ? [item.booking] : item.bookings));
  const requestedCount = allBookings.filter((booking) => booking.status === "REQUESTED").length;
  const inReviewCount = allBookings.filter((booking) => booking.status === "IN_REVIEW").length;
  const blockingCount = allBookings.filter((booking) =>
    booking.conflicts.some((conflict) => conflict.severity === "blocking"),
  ).length;

  const tableRows: BookingTableRow[] = items.map((item) => {
    if (item.kind === "single") {
      const booking = item.booking;
      return {
        key: `single-${booking.id}`,
        kind: "single",
        refId: booking.id,
        title: booking.title,
        usageTypeName: booking.usageTypeName,
        organizationName: booking.organizationName,
        buildingName: booking.buildingName,
        roomName: booking.roomName,
        timeLabel: booking.startsAtLabel,
        timeDetailLabel: `bis ${booking.endsAtLabel}`,
        status: booking.status,
        itemCount: 1,
        openCount: isOpenStatus(booking.status) ? 1 : 0,
        conflictCount: booking.conflicts.length,
        hasBlockingConflict: booking.conflicts.some((conflict) => conflict.severity === "blocking"),
      };
    }

    const first = item.bookings[0]!;
    const last = item.bookings[item.bookings.length - 1]!;
    const conflictCount = item.bookings.reduce((total, booking) => total + booking.conflicts.length, 0);
    return {
      key: `series-${item.seriesId}`,
      kind: "series",
      refId: item.seriesId,
      title: item.seriesTitle,
      usageTypeName: item.usageTypeName,
      organizationName: item.organizationName,
      buildingName: item.buildingName,
      roomName: item.roomName,
      timeLabel: first.startsAtLabel,
      timeDetailLabel: `bis ${last.startsAtLabel}`,
      status: null,
      itemCount: item.bookings.length,
      openCount: item.bookings.filter((booking) => isOpenStatus(booking.status)).length,
      conflictCount,
      hasBlockingConflict: item.bookings.some((booking) =>
        booking.conflicts.some((conflict) => conflict.severity === "blocking"),
      ),
    };
  });

  const selectedItem = selected
    ? (items.find((item) =>
        selected.kind === "single"
          ? item.kind === "single" && item.booking.id === selected.refId
          : item.kind === "series" && item.seriesId === selected.refId,
      ) ?? null)
    : null;

  function openRow(row: BookingTableRow) {
    setSelected({ kind: row.kind, refId: row.refId });
    setOpen(true);
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3">
        <StatChip label="Einträge" value={allBookings.length} />
        <StatChip label="Beantragt" value={requestedCount} />
        <StatChip label="In Prüfung" value={inReviewCount} />
        <StatChip label="Mit blockierendem Konflikt" value={blockingCount} />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
        <DataTable columns={columns} data={tableRows} searchPlaceholder="Buchungen filtern..." onRowClick={openRow} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={`max-h-[85vh] w-full overflow-y-auto ${selectedItem?.kind === "series" ? "max-w-3xl" : "max-w-2xl"}`}
        >
          {selectedItem ? (
            <>
              <DialogHeader>
                <DialogDescription className="flex items-center gap-2 font-medium uppercase tracking-[0.2em] text-primary">
                  {selectedItem.kind === "series" ? (
                    <Repeat className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                  )}
                  {selectedItem.kind === "series" ? "Serienantrag" : "Buchungsantrag"}
                </DialogDescription>
                <DialogTitle>
                  {selectedItem.kind === "series" ? selectedItem.seriesTitle : selectedItem.booking.title}
                </DialogTitle>
              </DialogHeader>

              {errorText ? (
                <p className="rounded-lg border border-rose-500/25 bg-red-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {errorText}
                </p>
              ) : null}

              {selectedItem.kind === "single" ? (
                <SingleBookingDetail
                  booking={selectedItem.booking}
                  filters={filters}
                  canApprove={canApprove}
                  canReject={canReject}
                />
              ) : (
                <SeriesDetail item={selectedItem} filters={filters} canApprove={canApprove} canReject={canReject} />
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function FilterHiddenInputs({ filters }: { filters: BookingFilterValues }) {
  return (
    <>
      <input type="hidden" name="status" value={filters.status} />
      <input type="hidden" name="organizationId" value={filters.organizationId} />
      <input type="hidden" name="buildingId" value={filters.buildingId} />
      <input type="hidden" name="roomId" value={filters.roomId} />
    </>
  );
}

function ConflictList({ conflicts, keyPrefix }: { conflicts: BookingConflictView[]; keyPrefix: string }) {
  if (conflicts.length === 0) {
    return <p className="mt-3 text-sm text-emerald-700">Aktuell keine Konflikte erkannt.</p>;
  }

  return (
    <ul className="mt-3 space-y-2 text-sm">
      {conflicts.map((conflict, index) => (
        <li
          key={`${keyPrefix}-conflict-${index}`}
          className={`rounded-lg border px-3 py-2 ${conflict.severity === "blocking" ? "border-rose-500/20 bg-destructive/10 text-rose-700" : "border-warning/35 bg-warning/15 text-warning-foreground"}`}
        >
          <span className="font-medium">{conflict.severity === "blocking" ? "Blockierend" : "Soft-Konflikt"}:</span>{" "}
          {conflict.message}
        </li>
      ))}
    </ul>
  );
}

type DecisionFormsProps = {
  booking: BookingView;
  filters: BookingFilterValues;
  canApprove: boolean;
  canReject: boolean;
  compact?: boolean;
};

function DecisionForms({ booking, filters, canApprove, canReject, compact }: DecisionFormsProps) {
  const hasClosureConflict = booking.conflicts.some(
    (conflict) => conflict.type === "CLOSURE" && conflict.severity === "blocking",
  );
  const isOpen = isOpenStatus(booking.status);

  if ((!canApprove && !canReject) || !isOpen) {
    return null;
  }

  return (
    <div className={`grid gap-3 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
      {canApprove && booking.status === "REQUESTED" ? (
        <form action={markBookingInReviewAction} className="rounded-xl border border-border bg-muted/30 p-3">
          <input type="hidden" name="bookingId" value={booking.id} />
          <FilterHiddenInputs filters={filters} />
          <p className="text-xs text-muted-foreground">Antrag zur fachlichen Prüfung übernehmen.</p>
          <Button type="submit" size="sm" className="mt-3">
            In Prüfung setzen
          </Button>
        </form>
      ) : null}
      {canApprove ? (
        <form action={approveBookingAction} className="rounded-xl border border-emerald-500/20 bg-muted/30 p-3">
          <input type="hidden" name="bookingId" value={booking.id} />
          <FilterHiddenInputs filters={filters} />
          {hasClosureConflict ? (
            <label className="mb-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
              <input name="allowClosureOverride" type="checkbox" className="mt-1 rounded border-input bg-background" />
              <span>
                <span className="block font-medium">Sperre bewusst als Ausnahme genehmigen</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Nur für fachlich gewollte Ausnahmen verwenden. Ein Kommentar ist erforderlich.
                </span>
              </span>
            </label>
          ) : null}
          <label className="block text-xs font-medium">
            Kommentar
            <textarea name="decisionNote" rows={2} required={hasClosureConflict} className={textareaClass} />
          </label>
          <Button type="submit" size="sm" className="mt-3" variant="success">
            Genehmigen
          </Button>
        </form>
      ) : null}
      {canReject ? (
        <form action={rejectBookingAction} className="rounded-xl border border-rose-500/20 bg-muted/30 p-3">
          <input type="hidden" name="bookingId" value={booking.id} />
          <FilterHiddenInputs filters={filters} />
          <label className="block text-xs font-medium">
            Begründung (erforderlich)
            <textarea name="decisionNote" rows={2} required className={textareaClass} />
          </label>
          <Button type="submit" size="sm" className="mt-3" variant="destructive">
            Ablehnen
          </Button>
        </form>
      ) : null}
    </div>
  );
}

type SingleBookingDetailProps = {
  booking: BookingView;
  filters: BookingFilterValues;
  canApprove: boolean;
  canReject: boolean;
};

function SingleBookingDetail({ booking, filters, canApprove, canReject }: SingleBookingDetailProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {booking.organizationName} | {booking.buildingName} - {booking.roomName} | {booking.usageTypeName}
        </p>
        <StatusBadge status={booking.status} />
      </div>
      <p className="text-sm font-medium">
        {booking.startsAtLabel} bis {booking.endsAtLabel}
      </p>
      {booking.description ? <p className="text-sm text-muted-foreground">{booking.description}</p> : null}

      <section className="rounded-xl border border-border bg-muted/40 p-4">
        <h4 className="text-sm font-medium">Konflikthinweise</h4>
        <ConflictList conflicts={booking.conflicts} keyPrefix={booking.id} />
      </section>

      {(canApprove || canReject) && isOpenStatus(booking.status) ? (
        <section className="rounded-xl border border-border bg-muted/40 p-4">
          <h4 className="text-sm font-medium">Entscheidung</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            Beantragte Buchungen können direkt genehmigt oder abgelehnt werden.
          </p>
          <div className="mt-4">
            <DecisionForms booking={booking} filters={filters} canApprove={canApprove} canReject={canReject} />
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-muted/40 p-4">
        <h4 className="text-sm font-medium">Historie</h4>
        <ul className="mt-3 space-y-3 text-sm">
          {booking.history.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-border bg-card p-3">
              <p className="font-medium">{entry.changeLabel}</p>
              <p className="mt-1 text-muted-foreground">{entry.metaLabel}</p>
              {entry.reason ? <p className="mt-2">{entry.reason}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

type SeriesDetailProps = {
  item: Extract<BookingManagerItem, { kind: "series" }>;
  filters: BookingFilterValues;
  canApprove: boolean;
  canReject: boolean;
};

function SeriesDetail({ item, filters, canApprove, canReject }: SeriesDetailProps) {
  const openItems = item.bookings.filter((booking) => isOpenStatus(booking.status));
  const requestedCount = openItems.filter((booking) => booking.status === "REQUESTED").length;
  const seriesHasClosureConflict = item.bookings.some((booking) =>
    booking.conflicts.some((conflict) => conflict.type === "CLOSURE" && conflict.severity === "blocking"),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {item.organizationName} | {item.buildingName} - {item.roomName} | {item.usageTypeName}
        </p>
        <Badge variant="outline">{item.bookings.length} Termine</Badge>
      </div>

      {(canApprove || canReject) && openItems.length > 0 ? (
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h4 className="text-sm font-medium">Ganze Serie bearbeiten</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            Betrifft alle {openItems.length} offenen Serientermine. Jeder Termin wird einzeln geprüft und historisiert.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {canApprove && requestedCount > 0 ? (
              <form action={markSeriesInReviewAction} className="rounded-xl border border-border bg-card p-3">
                <input type="hidden" name="seriesId" value={item.seriesId} />
                <FilterHiddenInputs filters={filters} />
                <p className="text-xs text-muted-foreground">{requestedCount} beantragten Termin(e) in Prüfung setzen.</p>
                <Button type="submit" size="sm" className="mt-3">
                  Serie in Prüfung
                </Button>
              </form>
            ) : null}
            {canApprove ? (
              <form action={approveSeriesAction} className="rounded-xl border border-emerald-500/20 bg-card p-3">
                <input type="hidden" name="seriesId" value={item.seriesId} />
                <FilterHiddenInputs filters={filters} />
                {seriesHasClosureConflict ? (
                  <label className="mb-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                    <input name="allowClosureOverride" type="checkbox" className="mt-1 rounded border-input bg-background" />
                    <span>
                      <span className="block font-medium">Sperren für Serie bewusst als Ausnahme genehmigen</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Wird nur auf Serientermine angewendet, deren harter Konflikt ausschließlich eine Sperre ist.
                      </span>
                    </span>
                  </label>
                ) : null}
                <label className="block text-xs font-medium">
                  Kommentar
                  <textarea name="decisionNote" rows={2} required={seriesHasClosureConflict} className={textareaClass} />
                </label>
                <Button type="submit" size="sm" className="mt-3" variant="success">
                  Serie genehmigen
                </Button>
              </form>
            ) : null}
            {canReject ? (
              <form action={rejectSeriesAction} className="rounded-xl border border-rose-500/20 bg-card p-3">
                <input type="hidden" name="seriesId" value={item.seriesId} />
                <FilterHiddenInputs filters={filters} />
                <label className="block text-xs font-medium">
                  Begründung (erforderlich)
                  <textarea name="decisionNote" rows={2} required className={textareaClass} />
                </label>
                <Button type="submit" size="sm" className="mt-3" variant="destructive">
                  Serie ablehnen
                </Button>
              </form>
            ) : null}
          </div>
        </section>
      ) : null}

      <section>
        <h4 className="text-sm font-medium">Termine</h4>
        <div className="mt-3 space-y-3">
          {item.bookings.map((booking) => (
            <div key={booking.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  {booking.startsAtLabel} bis {booking.endsAtLabel}
                </p>
                <StatusBadge status={booking.status} small />
              </div>
              {booking.conflicts.length > 0 ? (
                <ConflictList conflicts={booking.conflicts} keyPrefix={booking.id} />
              ) : null}
              <div className="mt-3">
                <DecisionForms booking={booking} filters={filters} canApprove={canApprove} canReject={canReject} compact />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
