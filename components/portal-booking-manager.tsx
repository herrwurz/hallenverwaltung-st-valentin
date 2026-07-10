"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarCheck, CalendarPlus, Plus, Repeat } from "lucide-react";
import { PortalBookingsTable, type PortalBookingTableRow } from "@/components/portal-bookings-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PortalBookingManagerProps = {
  rows: PortalBookingTableRow[];
  /** Serverseitig gerenderter Detail-Inhalt (Aktionen) je Buchungs-ID. */
  detailContent: Record<string, ReactNode>;
  newBookingForm: ReactNode;
  newSeriesForm: ReactNode;
  errorText?: string;
};

type OpenDialog = { kind: "detail"; bookingId: string } | { kind: "newBooking" } | { kind: "newSeries" } | null;

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
      <p className="text-2xl font-semibold leading-none tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function PortalBookingManager({ rows, detailContent, newBookingForm, newSeriesForm, errorText }: PortalBookingManagerProps) {
  const searchParams = useSearchParams();
  const savedMarker = searchParams.get("ts");
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const [closedForMarker, setClosedForMarker] = useState<string | null>(null);

  // Nach erfolgreichem Speichern (neuer "ts"-Marker in der URL) den Dialog
  // schliessen. Anpassung waehrend des Renderns statt in einem Effect, siehe
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (savedMarker && savedMarker !== closedForMarker) {
    setClosedForMarker(savedMarker);
    setOpenDialog(null);
  }

  const requestedCount = rows.filter((row) => row.status === "REQUESTED").length;
  const approvedCount = rows.filter((row) => row.status === "APPROVED").length;

  const selectedRow =
    openDialog?.kind === "detail" ? (rows.find((row) => row.id === openDialog.bookingId) ?? null) : null;

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <StatChip label="Anträge" value={rows.length} />
          <StatChip label="Beantragt" value={requestedCount} />
          <StatChip label="Genehmigt" value={approvedCount} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setOpenDialog({ kind: "newBooking" })} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Neuer Buchungsantrag
          </Button>
          <Button onClick={() => setOpenDialog({ kind: "newSeries" })} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Neuer Serienantrag
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
        <PortalBookingsTable rows={rows} onRowClick={(row) => setOpenDialog({ kind: "detail", bookingId: row.id })} />
      </div>

      <Dialog open={openDialog !== null} onOpenChange={(open) => (open ? undefined : setOpenDialog(null))}>
        <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto">
          {openDialog?.kind === "newBooking" ? (
            <>
              <DialogHeader>
                <DialogDescription className="flex items-center gap-2 font-medium uppercase tracking-[0.2em] text-primary">
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  Neuer Buchungsantrag
                </DialogDescription>
                <DialogTitle>Einzeltermin beantragen</DialogTitle>
              </DialogHeader>
              {errorText ? (
                <p className="rounded-lg border border-rose-500/25 bg-red-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {errorText}
                </p>
              ) : null}
              {newBookingForm}
            </>
          ) : null}
          {openDialog?.kind === "newSeries" ? (
            <>
              <DialogHeader>
                <DialogDescription className="flex items-center gap-2 font-medium uppercase tracking-[0.2em] text-primary">
                  <Repeat className="h-4 w-4" aria-hidden="true" />
                  Neuer Serienantrag
                </DialogDescription>
                <DialogTitle>Serientermine beantragen</DialogTitle>
              </DialogHeader>
              {errorText ? (
                <p className="rounded-lg border border-rose-500/25 bg-red-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {errorText}
                </p>
              ) : null}
              {newSeriesForm}
            </>
          ) : null}
          {openDialog?.kind === "detail" && selectedRow ? (
            <>
              <DialogHeader>
                <DialogDescription className="flex items-center gap-2 font-medium uppercase tracking-[0.2em] text-primary">
                  <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                  Buchungsantrag
                </DialogDescription>
                <DialogTitle>{selectedRow.title}</DialogTitle>
              </DialogHeader>
              {errorText ? (
                <p className="rounded-lg border border-rose-500/25 bg-red-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {errorText}
                </p>
              ) : null}
              {detailContent[selectedRow.id]}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
