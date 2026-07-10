import { AdminBackLink } from "@/components/admin-back-link";
import { AdminFeedback } from "@/components/admin-feedback";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserManager } from "@/components/user-manager";
import { requirePermission } from "@/lib/permissions";
import { getUserAdministrationData } from "@/lib/services/admin/user-service";

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function UsersPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_USERS");
  const [params, data] = await Promise.all([searchParams, getUserAdministrationData()]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Benutzer</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Benutzer-Verwaltung</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Benutzerzugang, Rollen und Organisationsmitgliedschaften verwalten. Auf einen Eintrag klicken, um ihn zu
        bearbeiten.
      </p>
      <AdminBackLink />
      <div className="mt-8">
        <AdminFeedback {...params} />
      </div>

      <UserManager users={data.users} roles={data.roles} organizations={data.organizations} buildings={data.buildings} />

      {data.standaloneCaretakers.length > 0 ? (
        <section className="mt-10 space-y-4">
          <h3 className="text-xl font-semibold tracking-tight">Hallenwarte ohne Benutzerkonto</h3>
          <p className="text-sm text-muted-foreground">
            Diese Hallenwarte sind in der Datenbank erfasst, haben aber noch kein Benutzerkonto. Um ihnen Zugang zu
            geben, legen Sie unter „Neuer Benutzer“ ein Konto an und weisen Sie die Rolle „Hallenwart“ zu.
          </p>
          {data.standaloneCaretakers.map((caretaker) => (
            <Card key={caretaker.id}>
              <CardHeader>
                <div className="flex justify-between gap-4">
                  <div>
                    <CardTitle>{caretaker.name}</CardTitle>
                    <CardDescription>
                      {caretaker.email ?? "Keine E-Mail"} |{" "}
                      {caretaker.buildings.length > 0
                        ? caretaker.buildings.map((bc) => bc.building.name).join(", ")
                        : "Kein Gebäude zugeordnet"}
                    </CardDescription>
                  </div>
                  <Badge variant={caretaker.isActive ? "outline" : "secondary"}>
                    {caretaker.isActive ? "Kein Login" : "Inaktiv"}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          ))}
        </section>
      ) : null}
    </>
  );
}
