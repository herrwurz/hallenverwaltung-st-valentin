import { AreaShell } from "@/components/area-shell";
import { requirePermission } from "@/lib/permissions";

export default async function AdminPage() {
  const user = await requirePermission("MANAGE_USERS");

  return (
    <AreaShell
      eyebrow="Verwaltung"
      title="Admin-Bereich"
      description="Geschuetzter Verwaltungsbereich. Fachfunktionen werden in spaeteren Phasen umgesetzt."
      userName={user.name}
    >
      <p className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
        Authentifizierung und Rollenpruefung sind aktiv. Es gibt noch keine Buchungs- oder Verwaltungslogik.
      </p>
    </AreaShell>
  );
}
