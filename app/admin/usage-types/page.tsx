import { saveUsageTypeAction } from "@/app/admin/actions";
import { AdminBackLink } from "@/components/admin-back-link";
import { AdminFeedback } from "@/components/admin-feedback";
import { UsageTypesTable, type UsageTypeTableRow } from "@/components/admin-master-data-tables";
import { FormActions } from "@/components/form-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import { getUsageTypeAdministrationData } from "@/lib/services/admin/usage-type-service";

const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm";

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function UsageTypesPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_USERS");
  const [params, usageTypes] = await Promise.all([searchParams, getUsageTypeAdministrationData()]);

  const tableRows: UsageTypeTableRow[] = usageTypes.map((ut) => ({
    id: ut.id,
    code: ut.code,
    name: ut.name,
    priority: ut.priority,
    requiresApproval: ut.requiresApproval,
    mayDisplaceLowerPriority: ut.mayDisplaceLowerPriority,
    isActive: ut.isActive,
  }));

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Stammdaten</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Nutzungstypen</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Nutzungstypen kategorisieren Buchungen und steuern Genehmigungspflicht und Verdrängungslogik.
        Niedrigere Prioritätszahl = höhere Priorität.
      </p>
      <AdminBackLink />
      <div className="mt-8">
        <AdminFeedback {...params} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Neuer Nutzungstyp</CardTitle>
          <CardDescription>Code, Name, Priorität und Verhalten festlegen.</CardDescription>
        </CardHeader>
        <CardContent>
          <UsageTypeForm />
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Übersicht</CardTitle>
          <CardDescription>Alle Nutzungstypen sortiert nach Priorität.</CardDescription>
        </CardHeader>
        <CardContent>
          <UsageTypesTable rows={tableRows} />
        </CardContent>
      </Card>

      <section className="mt-8 space-y-4">
        <h3 className="text-xl font-semibold tracking-tight">Nutzungstypen bearbeiten</h3>
        {usageTypes.map((ut) => (
          <Card key={ut.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{ut.name}</CardTitle>
                  <CardDescription>
                    {ut.code} | Priorität {ut.priority}
                  </CardDescription>
                </div>
                <Badge variant={ut.isActive ? "success" : "secondary"}>
                  {ut.isActive ? "Aktiv" : "Inaktiv"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <UsageTypeForm usageType={ut} />
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

type UsageTypeFormProps = {
  usageType?: Awaited<ReturnType<typeof getUsageTypeAdministrationData>>[number];
};

function UsageTypeForm({ usageType }: UsageTypeFormProps) {
  return (
    <form action={saveUsageTypeAction} className="grid gap-4 lg:grid-cols-4">
      {usageType ? <input type="hidden" name="id" value={usageType.id} /> : null}
      <label className="text-sm font-medium">
        Code
        <input
          name="code"
          required
          readOnly={Boolean(usageType)}
          defaultValue={usageType?.code}
          className={usageType ? `${inputClass} bg-muted text-muted-foreground` : inputClass}
          placeholder="z.B. SCHULSPORT"
        />
        {usageType ? (
          <span className="mt-1 block text-xs text-muted-foreground">Der Code bleibt nach dem Anlegen unverändert.</span>
        ) : null}
      </label>
      <label className="text-sm font-medium">
        Name
        <input name="name" required defaultValue={usageType?.name} className={inputClass} placeholder="z.B. Schulsport" />
      </label>
      <label className="text-sm font-medium">
        Priorität
        <input
          name="priority"
          type="number"
          required
          min={1}
          max={9999}
          defaultValue={usageType?.priority ?? 10}
          className={inputClass}
        />
        <span className="mt-1 block text-xs text-muted-foreground">Niedrigere Zahl = höhere Priorität</span>
      </label>
      <div className="flex flex-col gap-3 pt-6">
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="requiresApproval" defaultChecked={usageType?.requiresApproval ?? true} />
          Genehmigung erforderlich
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="mayDisplaceLowerPriority"
            defaultChecked={usageType?.mayDisplaceLowerPriority ?? false}
          />
          Darf Typen mit niedrigerer Priorität verdrängen
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="isActive" defaultChecked={usageType?.isActive ?? true} />
          Aktiv
        </label>
      </div>
      <div className="lg:col-span-4">
        <FormActions
          submitLabel={usageType ? "Änderungen speichern" : "Nutzungstyp anlegen"}
          cancelHref="/admin/usage-types"
        />
      </div>
    </form>
  );
}
