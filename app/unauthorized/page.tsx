import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <section className="max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-10">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-red-300">Kein Zugriff</p>
        <h1 className="mt-4 text-3xl font-semibold">Berechtigung fehlt</h1>
        <p className="mt-4 text-slate-300">
          Ihr Benutzerkonto besitzt nicht die erforderliche Berechtigung für diesen Bereich.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-lg border border-slate-600 px-5 py-3 text-sm transition hover:border-sky-400"
        >
          Zum Dashboard
        </Link>
      </section>
    </main>
  );
}
