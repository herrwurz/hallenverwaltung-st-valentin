import { AreaShell } from "@/components/area-shell";
import { requirePermission } from "@/lib/permissions";

export default async function PortalPage() {
  const user = await requirePermission("REQUEST_BOOKING");

  return (
    <AreaShell
      eyebrow="Portal"
      title="Organisationsportal"
      description="Geschuetzter Bereich fuer Vereine, VHS und Schulen."
      userName={user.name}
    >
      <p className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
        Der Portalzugang ist eingerichtet. Buchungsfunktionen sind ausdruecklich noch nicht enthalten.
      </p>
    </AreaShell>
  );
}
