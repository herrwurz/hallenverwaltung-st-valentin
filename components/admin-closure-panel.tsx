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
};

type AdminClosurePanelProps = {
  action: (formData: FormData) => void | Promise<void>;
  targetName: "buildingId" | "roomId";
  targetId: string;
  closures: ClosureRecord[];
};

function getClosureStatusLabel(status: ClosureStatus) {
  switch (status) {
    case "OPEN":
      return "Geöffnet";
    case "RESTRICTED":
      return "Eingeschränkt";
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

export function AdminClosurePanel({ action, targetName, targetId, closures }: AdminClosurePanelProps) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
      <h4 className="text-sm font-semibold tracking-tight">Sperre erfassen</h4>
      <p className="mt-1 text-xs text-muted-foreground">
        Für Ferien, Reinigung, Wartung oder sonstige Einschränkungen. Gesperrte Zeiten blockieren Buchungsanträge und Kalender.
      </p>

      <form action={action} className="mt-4 grid gap-3 lg:grid-cols-4">
        <input type="hidden" name={targetName} value={targetId} />
        <label className="text-sm font-medium">
          Status
          <select name="status" required defaultValue="CLOSED" className={inputClass}>
            <option value="CLOSED">Gesperrt</option>
            <option value="RESTRICTED">Eingeschränkt</option>
            <option value="OPEN">Geöffnet</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Beginn
          <input name="startsAt" type="datetime-local" required className={inputClass} />
        </label>
        <label className="text-sm font-medium">
          Ende
          <input name="endsAt" type="datetime-local" required className={inputClass} />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm font-medium">
          <input name="isPublic" type="checkbox" defaultChecked className="rounded border-input bg-background" />
          Sichtbar
        </label>
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
        {closures.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            Noch keine Sperren erfasst.
          </p>
        ) : (
          <div className="space-y-2">
            {closures.map((closure) => (
              <div key={closure.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{closure.reason}</p>
                  <Badge variant={getClosureBadgeVariant(closure.status)}>{getClosureStatusLabel(closure.status)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dateFormatter.format(closure.startsAt)} bis {dateFormatter.format(closure.endsAt)} ·{" "}
                  {closure.isPublic ? "sichtbar" : "intern"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
