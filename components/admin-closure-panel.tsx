import type { ClosureStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";
const dateFormatter = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });

type ClosureRecord = {
  id: string;
  status: ClosureStatus;
  reason: string;
  startsAt: Date;
  endsAt: Date;
  isPublic: boolean;
  sourceLabel?: string;
};

type AdminClosurePanelProps = {
  action: (formData: FormData) => void | Promise<void>;
  updateAction?: (formData: FormData) => void | Promise<void>;
  deleteAction?: (formData: FormData) => void | Promise<void>;
  targetName: "buildingId" | "roomId";
  targetId: string;
  closures: ClosureRecord[];
  relatedClosures?: ClosureRecord[];
};

function toDateTimeLocalValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function getClosureStatusLabel(status: ClosureStatus) {
  switch (status) {
    case "OPEN":
      return "Geoeffnet";
    case "RESTRICTED":
      return "Eingeschraenkt";
    case "CLOSED":
      return "Gesperrt";
    default:
      return status;
  }
}

function getClosureBadgeVariant(status: ClosureStatus) {
  if (status === "CLOSED") {
    return "destructive";
  }

  if (status === "RESTRICTED") {
    return "warning";
  }

  return "secondary";
}

function ClosureList({
  closures,
  emptyText,
  updateAction,
  deleteAction,
}: {
  closures: ClosureRecord[];
  emptyText: string;
  updateAction?: (formData: FormData) => void | Promise<void>;
  deleteAction?: (formData: FormData) => void | Promise<void>;
}) {
  if (closures.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {closures.map((closure) => (
        <div
          key={`${closure.sourceLabel ?? "direct"}-${closure.id}`}
          className="rounded-lg border border-border bg-background p-3 text-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{closure.reason}</p>
            <Badge variant={getClosureBadgeVariant(closure.status)}>{getClosureStatusLabel(closure.status)}</Badge>
          </div>
          {closure.sourceLabel ? <p className="mt-1 text-xs font-medium text-primary">{closure.sourceLabel}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {dateFormatter.format(closure.startsAt)} bis {dateFormatter.format(closure.endsAt)} ·{" "}
            {closure.isPublic ? "sichtbar" : "intern"}
          </p>
          {updateAction ? (
            <form action={updateAction} className="mt-3 grid gap-2 rounded-lg bg-muted/40 p-3 lg:grid-cols-5">
              <input type="hidden" name="id" value={closure.id} />
              <label className="text-xs font-medium">
                Status
                <select name="status" required defaultValue={closure.status} className={inputClass}>
                  <option value="CLOSED">Gesperrt</option>
                  <option value="RESTRICTED">Eingeschraenkt</option>
                  <option value="OPEN">Geoeffnet</option>
                </select>
              </label>
              <label className="text-xs font-medium">
                Beginn
                <input name="startsAt" type="datetime-local" required defaultValue={toDateTimeLocalValue(closure.startsAt)} className={inputClass} />
              </label>
              <label className="text-xs font-medium">
                Ende
                <input name="endsAt" type="datetime-local" required defaultValue={toDateTimeLocalValue(closure.endsAt)} className={inputClass} />
              </label>
              <label className="text-xs font-medium lg:col-span-2">
                Grund
                <input name="reason" required maxLength={1000} defaultValue={closure.reason} className={inputClass} />
              </label>
              <label className="flex items-center gap-2 text-xs font-medium">
                <input name="isPublic" type="checkbox" defaultChecked={closure.isPublic} className="rounded border-input bg-background" />
                Sichtbar
              </label>
              <div className="flex items-center justify-end lg:col-span-4">
                <Button type="submit" size="sm" variant="outline">
                  Aenderung speichern
                </Button>
              </div>
            </form>
          ) : null}
          {deleteAction ? (
            <form action={deleteAction} className="mt-2 flex justify-end">
              <input type="hidden" name="id" value={closure.id} />
              <Button type="submit" size="sm" variant="destructive">
                Sperre loeschen
              </Button>
            </form>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function AdminClosurePanel({
  action,
  updateAction,
  deleteAction,
  targetName,
  targetId,
  closures,
  relatedClosures = [],
}: AdminClosurePanelProps) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
      <h4 className="text-sm font-semibold tracking-tight">Sperre erfassen</h4>
      <p className="mt-1 text-xs text-muted-foreground">
        Fuer Ferien, Reinigung, Wartung oder sonstige Einschraenkungen. Gesperrte Zeiten blockieren Buchungsantraege und
        Kalender.
      </p>

      <form action={action} className="mt-4 grid gap-3 lg:grid-cols-4">
        <input type="hidden" name={targetName} value={targetId} />
        <label className="text-sm font-medium">
          Status
          <select name="status" required defaultValue="CLOSED" className={inputClass}>
            <option value="CLOSED">Gesperrt</option>
            <option value="RESTRICTED">Eingeschraenkt</option>
            <option value="OPEN">Geoeffnet</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Beginn
          <input name="startsAt" type="datetime-local" className={inputClass} />
        </label>
        <label className="text-sm font-medium">
          Ende
          <input name="endsAt" type="datetime-local" className={inputClass} />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm font-medium">
          <input name="isPublic" type="checkbox" defaultChecked className="rounded border-input bg-background" />
          Sichtbar
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm font-medium">
          <input name="isAllDay" type="checkbox" className="rounded border-input bg-background" />
          Ganztags
        </label>
        <label className="text-sm font-medium">
          Datum ganztags
          <input name="startsOn" type="date" className={inputClass} />
        </label>
        <label className="text-sm font-medium">
          Bis Datum
          <input name="endsOn" type="date" className={inputClass} />
        </label>
        <p className="text-xs text-muted-foreground lg:col-span-4">
          Bei ganztagigen Sperren genuegt das Datum. Intern wird bis 00:00 Uhr des Folgetags blockiert. Ohne ganztags
          sind Beginn und Ende mit Uhrzeit erforderlich.
        </p>
        <label className="text-sm font-medium lg:col-span-3">
          Grund
          <input name="reason" required maxLength={1000} className={inputClass} placeholder="z. B. Ferien, Reinigung, Wartung" />
        </label>
        <div className="flex items-end lg:justify-end">
          <Button type="submit">Sperre speichern</Button>
        </div>
      </form>

      <div className="mt-5 space-y-2">
        <h5 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Letzte Sperren</h5>
        <ClosureList
          closures={closures}
          emptyText="Noch keine Sperren erfasst."
          updateAction={updateAction}
          deleteAction={deleteAction}
        />
      </div>

      {relatedClosures.length > 0 ? (
        <div className="mt-5 space-y-2">
          <h5 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Weitere wirksame Sperren
          </h5>
          <ClosureList closures={relatedClosures} emptyText="Keine weiteren wirksamen Sperren." />
        </div>
      ) : null}
    </div>
  );
}
