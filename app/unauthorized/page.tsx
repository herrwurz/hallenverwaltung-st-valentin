import { AppBackLink } from "@/components/app-back-link";
import { LogoutButton } from "@/components/logout-button";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const diagnosticPermissions = ["MANAGE_USERS", "REQUEST_BOOKING", "VIEW_BOOKINGS"] as const;

export default async function UnauthorizedPage() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          email: true,
          displayName: true,
          isActive: true,
          roles: { select: { role: { select: { code: true } } } },
        },
      })
    : null;
  const permissionDiagnostics =
    session?.user?.id
      ? await Promise.all(
          diagnosticPermissions.map(async (permission) => ({
            permission,
            granted: await hasPermission(session.user.id, permission),
          })),
        )
      : [];

  return (
    <main className="windows-shell flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-lg rounded-sm border border-red-300 bg-red-50 p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-red-900">Kein Zugriff</p>
        <h1 className="mt-4 text-3xl font-semibold text-foreground">Berechtigung fehlt</h1>
        <p className="mt-4 text-slate-700">
          Ihr Benutzerkonto besitzt nicht die erforderliche Berechtigung für diesen Bereich.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Falls Sie gerade mit einem anderen Testkonto arbeiten möchten, melden Sie sich zuerst ab und danach neu an.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <AppBackLink href="/dashboard" label="Zurück zum Dashboard" />
          <LogoutButton />
        </div>
        <div className="mt-8 rounded-sm border border-red-200 bg-white/70 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Teststand-Diagnose</p>
          <dl className="mt-3 space-y-1">
            <div>
              <dt className="inline font-medium">Angemeldet als: </dt>
              <dd className="inline">{user?.email ?? session?.user?.email ?? "keine aktive Session"}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Benutzer aktiv: </dt>
              <dd className="inline">{user ? (user.isActive ? "ja" : "nein") : "-"}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Rollen: </dt>
              <dd className="inline">{user?.roles.map(({ role }) => role.code).join(", ") || "-"}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Kernrechte: </dt>
              <dd className="inline">
                {permissionDiagnostics.length
                  ? permissionDiagnostics
                      .map(({ permission, granted }) => `${permission}: ${granted ? "ja" : "nein"}`)
                      .join(", ")
                  : "-"}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
