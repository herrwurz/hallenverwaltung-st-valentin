import Link from "next/link";

export default function Home() {
  return (
    <main className="windows-shell flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-2xl rounded-sm border border-slate-300 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-blue-700">Hallenverwaltung</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">St. Valentin</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">
          Zentrale Verwaltung für Hallen, Buchungsanträge, Kalender, Wartelisten und Abrechnungsvorbereitung.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Link
            href="/public"
            className="rounded-sm border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Öffentlicher Bereich
          </Link>
          <Link
            href="/portal"
            className="rounded-sm border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Vereinsportal
          </Link>
          <Link
            href="/admin"
            className="rounded-sm border border-blue-700 bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Verwaltung
          </Link>
        </div>
        <p className="mt-6 text-sm text-slate-500">
          Für geschützte Bereiche werden Sie automatisch zum Login weitergeleitet.
        </p>
      </section>
    </main>
  );
}
