export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <section className="max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-10 shadow-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-400">
          Phase 1
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Hallenverwaltung St. Valentin
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-300">
          Das technische Grundgerüst ist eingerichtet. Fachliche Funktionen
          folgen in einer späteren Phase.
        </p>
      </section>
    </main>
  );
}
