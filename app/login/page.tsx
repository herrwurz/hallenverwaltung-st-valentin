import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/app/login/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="windows-shell flex min-h-screen items-center justify-center bg-background px-6 py-10 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">Login</p>
          <CardTitle className="mt-3 text-3xl">Hallenverwaltung</CardTitle>
          <CardDescription className="text-base">
            Melden Sie sich mit Ihrer E-Mail-Adresse und Ihrem Passwort an.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
