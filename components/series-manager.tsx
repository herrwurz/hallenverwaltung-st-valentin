"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { Repeat } from "lucide-react";
import {
  approveSeriesFromSeriesPageAction,
  markSeriesInReviewFromSeriesPageAction,
  rejectSeriesFromSeriesPageAction,
} from "@/app/admin/series/actions";
import { SeriesDataTable, type SeriesTableRow } from "@/components/phase25-data-tables";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getBookingStatusBadgeClass, getBookingStatusLabel } from "@/lib/booking-status";

const textareaClass = "mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

export type SeriesManagerItem = {
  id: string;
  title: string;
  organizationName: string;
  roomLabel: string;
  recurrenceLabel: string;
  periodLabel: string;
  statusLabel: string;
  statusTone: "success" | "destructive" | "warning" | "secondary";
  highlighted: boolean;
  requestedCount: number;
  inReviewCount: number;
  bookings: Array<{ id: string; status: BookingStatus; rangeLabel: string }>;
};

type SeriesManagerProps = {
  items: SeriesManagerItem[];
  canApprove: boolean;
  canReject: boolean;
  errorText?: string;
};

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
      <p className="text-2xl font-semibold leading-none tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function SeriesManager({ items, canApprove, canReject, errorText }: SeriesManagerProps) {
  const searchParams = useSearchParams();
  const savedMarker = searchParams.get("ts");
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [closedForMarker, setClosedForMarker] = useState<string | null>(null);

  // Nach erfolgreicher Entscheidung (neuer "ts"-Marker in der URL) den Dialog
  // schliessen. Anpassung waehrend des Renderns statt in einem Effect, siehe
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (savedMarker && savedMarker !== closedForMarker) {
    setClosedForMarker(savedMarker);
    setOpen(false);
  }

  const openSeriesCount = items.filter((item) => item.requestedCount + item.inReviewCount > 0).length;

  const tableRows: SeriesTableRow[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    recurrence: item.recurrenceLabel,
    statusLabel: item.statusLabel,
    statusTone: item.statusTone,
    organization: item.organizationName,
    room: item.roomLabel,
    period: item.periodLabel,
    occurrenceCount: item.bookings.length,
    openCount: item.requestedCount + item.inReviewCount,
  }));

  const selectedItem = selectedId ? (items.find((item) => item.id === selectedId) ?? null) : null;

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3">
        <StatChip label="Serien" value={items.length} />
        <StatChip label="Mit offenen Terminen" value={openSeriesCount} />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
        <SeriesDataTable
          rows={tableRows}
          onRowClick={(row) => {
            setSelectedId(row.id);
            setOpen(true);
          }}
          rowClassName={(row) =>
            items.find((item) => item.id === row.id)?.highlighted ? "bg-primary/5" : undefined
          }
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-full max-w-3xl overflow-y-auto">
          {selectedItem ? (
            <>
              <DialogHeader>
                <DialogDescription className="flex items-center gap-2 font-medium uppercase tracking-[0.2em] text-primary">
                  <Repeat className="h-4 w-4" aria-hidden="true" />
                  Serienantrag
                </DialogDescription>
                <DialogTitle>{selectedItem.title}</DialogTitle>
              </DialogHeader>

              {errorText ? (
                <p className="rounded-lg border border-rose-500/25 bg-red-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {errorText}
                </p>
              ) : null}

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.organizationName} | {selectedItem.roomLabel} | {selectedItem.recurrenceLabel}
                  </p>
                  <Badge variant={selectedItem.statusTone}>{selectedItem.statusLabel}</Badge>
                </div>
                <p className="text-sm font-medium">{selectedItem.periodLabel}</p>

                {(canApprove || canReject) && selectedItem.requestedCount + selectedItem.inReviewCount > 0 ? (
                  <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <h4 className="text-sm font-medium">Gesamt bearbeiten</h4>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Betrifft alle offenen Serientermine. Jeder Termin wird einzeln geprüft und historisiert.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {canApprove && selectedItem.requestedCount > 0 ? (
                        <form action={markSeriesInReviewFromSeriesPageAction} className="rounded-xl border border-border bg-card p-3">
                          <input type="hidden" name="seriesId" value={selectedItem.id} />
                          <p className="text-xs text-muted-foreground">
                            {selectedItem.requestedCount} beantragten{" "}
                            {selectedItem.requestedCount === 1 ? "Termin" : "Termine"} in Prüfung setzen.
                          </p>
                          <Button type="submit" size="sm" className="mt-3">
                            Serie in Prüfung
                          </Button>
                        </form>
                      ) : null}
                      {canApprove ? (
                        <form action={approveSeriesFromSeriesPageAction} className="rounded-xl border border-emerald-500/20 bg-card p-3">
                          <input type="hidden" name="seriesId" value={selectedItem.id} />
                          <label className="mb-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                            <input name="allowClosureOverride" type="checkbox" className="mt-1 rounded border-input bg-background" />
                            <span>
                              <span className="block font-medium">Sperren als Ausnahme genehmigen</span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                Nur anwenden wenn Sperrkonflikte gewollt überschrieben werden sollen.
                              </span>
                            </span>
                          </label>
                          <label className="block text-xs font-medium">
                            Kommentar
                            <textarea name="decisionNote" rows={2} className={textareaClass} />
                          </label>
                          <Button type="submit" size="sm" className="mt-3" variant="success">
                            Gesamt genehmigen
                          </Button>
                        </form>
                      ) : null}
                      {canReject ? (
                        <form action={rejectSeriesFromSeriesPageAction} className="rounded-xl border border-rose-500/20 bg-card p-3">
                          <input type="hidden" name="seriesId" value={selectedItem.id} />
                          <label className="block text-xs font-medium">
                            Begründung (erforderlich)
                            <textarea name="decisionNote" rows={2} required className={textareaClass} />
                          </label>
                          <Button type="submit" size="sm" className="mt-3" variant="destructive">
                            Gesamt ablehnen
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                <section className="rounded-xl border border-border bg-muted/40 p-4">
                  <h4 className="text-sm font-medium">Termine</h4>
                  <ul className="mt-3 space-y-1">
                    {selectedItem.bookings.map((booking) => (
                      <li key={booking.id} className="flex items-center gap-3 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs leading-none ${getBookingStatusBadgeClass(booking.status)}`}
                        >
                          {getBookingStatusLabel(booking.status)}
                        </span>
                        <span className="text-muted-foreground">{booking.rangeLabel}</span>
                      </li>
                    ))}
                    {selectedItem.bookings.length === 0 ? (
                      <li className="text-sm text-muted-foreground">Keine Termine vorhanden.</li>
                    ) : null}
                  </ul>
                </section>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
