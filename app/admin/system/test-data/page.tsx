import { createTestDataAction, deleteTestDataAction } from "@/app/admin/system/test-data/actions";
import { AppBackLink } from "@/components/app-back-link";
import { AppFeedback } from "@/components/app-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveSession } from "@/lib/permissions";
import { getTestDataStatus, isTestDataToolsEnabled } from "@/lib/services/test-data-service";
import { redirect } from "next/navigation";

type SearchParams = Promise<{
  success?: string;
  error?: string;
}>;

async function requireTestDataAdmin() {
  const user = await requireActiveSession();
  if (!user.roles.includes("SUPER_ADMIN") && !user.roles.includes("SYSTEM_ADMIN")) {
    redirect("/unauthorized");
  }
  return user;
}

function StatusCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export default async function AdminTestDataPage({ searchParams }: { searchParams: SearchParams }) {
  await requireTestDataAdmin();
  const params = await searchParams;
  const status = await getTestDataStatus();
  const enabled = isTestDataToolsEnabled();

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">System</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Testdaten</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Sichere Testdatenverwaltung für den Hetzner-Testserver. Die Werkzeuge funktionieren nur mit
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">TEST_DATA_TOOLS_ENABLED=true</code>
            und sind auf SUPER_ADMIN oder SYSTEM_ADMIN beschränkt.
          </p>
        </div>
        <AppBackLink href="/admin" label="Zurück zum Dashboard" />
      </div>

      <AppFeedback
        messages={[
          { tone: "success", text: params.success },
          { tone: "error", text: params.error },
        ]}
      />

      {!enabled ? (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
          Testdaten-Werkzeuge sind in dieser Umgebung deaktiviert. Setze die Variable
          <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs">TEST_DATA_TOOLS_ENABLED=true</code>
          nur in der Testumgebung, niemals in Produktion.
        </div>
      ) : null}

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard label="Testbenutzer" value={status.users} />
        <StatusCard label="Organisationen" value={status.organizations} />
        <StatusCard label="Gebäude" value={status.buildings} />
        <StatusCard label="Räume" value={status.rooms} />
        <StatusCard label="Hauswarte" value={status.caretakers} />
        <StatusCard label="Aktive Testbuchungen" value={status.bookings} />
        <StatusCard label="Archivierte Testbuchungen" value={status.archivedBookings} />
        <StatusCard label="Werkzeugstatus" value={status.enabled ? "aktiv" : "deaktiviert"} />
      </section>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Aktionen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <form action={createTestDataAction} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-lg font-medium">Testdaten erzeugen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Legt markierte Testbenutzer, Testgebäude, Testräume, Testorganisationen, Hauswart und realistische
              Buchungen für die nächsten 30 bis 60 Tage an.
            </p>
            <Button className="mt-5" disabled={!enabled}>
              Testdaten erzeugen
            </Button>
          </form>

          <form action={deleteTestDataAction} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-lg font-medium">Testdaten löschen</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Deaktiviert ausschließlich eindeutig markierte Testdaten. Buchungen werden aus
              Historisierungsgründen archiviert statt physisch gelöscht.
            </p>
            <Button className="mt-5" type="submit" variant="destructive" disabled={!enabled}>
              Testdaten löschen
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
