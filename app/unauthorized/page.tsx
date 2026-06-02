import { AppBackLink } from "@/components/app-back-link";

export default function UnauthorizedPage() {
  return (
    <main className="windows-shell flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-lg rounded-sm border border-red-300 bg-red-50 p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-red-900">Kein Zugriff</p>
        <h1 className="mt-4 text-3xl font-semibold text-foreground">Berechtigung fehlt</h1>
        <p className="mt-4 text-slate-700">
          Ihr Benutzerkonto besitzt nicht die erforderliche Berechtigung für diesen Bereich.
        </p>
        <div className="mt-8">
          <AppBackLink href="/dashboard" label="Zurück zum Dashboard" />
        </div>
      </section>
    </main>
  );
}
