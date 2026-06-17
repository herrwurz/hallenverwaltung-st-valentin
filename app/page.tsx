import { auth } from "@/auth";
import { LoginForm } from "@/app/login/login-form";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    const user = session.user.id
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

    return (
      <main className="windows-shell flex min-h-screen items-center justify-center bg-background px-6 py-10 text-foreground">
        <Card className="w-full max-w-md">
          <CardHeader>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">Hallenverwaltung</p>
            <CardTitle className="mt-3 text-3xl">Bereits angemeldet</CardTitle>
            <CardDescription className="text-base">
              Sie sind aktuell angemeldet. Melden Sie sich ab, wenn Sie mit einem anderen Konto arbeiten möchten.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Benutzer:</span>{" "}
                {user?.email ?? session.user.email ?? "unbekannt"}
              </p>
              <p>
                <span className="font-medium text-foreground">Aktiv:</span> {user ? (user.isActive ? "ja" : "nein") : "-"}
              </p>
              <p>
                <span className="font-medium text-foreground">Rollen:</span>{" "}
                {user?.roles.map(({ role }) => role.code).join(", ") || "-"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href="/dashboard">Zum Dashboard</a>
              </Button>
              <LogoutButton />
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="windows-shell flex min-h-screen items-center justify-center bg-background px-6 py-10 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">Hallenverwaltung</p>
          <CardTitle className="mt-3 text-3xl">St. Valentin</CardTitle>
          <CardDescription className="text-base">
            Ein gemeinsamer Login für Verwaltungsportal, Vereinsportal und weitere berechtigte Benutzer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="mt-5 text-sm text-muted-foreground">
            Nach der Anmeldung werden Sie automatisch in den passenden Bereich weitergeleitet.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
