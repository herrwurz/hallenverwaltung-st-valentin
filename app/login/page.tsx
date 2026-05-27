import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-400">Login</p>
        <h1 className="mt-4 text-3xl font-semibold">Hallenverwaltung</h1>
        <p className="mt-3 text-slate-300">
          Melden Sie sich mit Ihrer E-Mail-Adresse und Ihrem Passwort an.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
