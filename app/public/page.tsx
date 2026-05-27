import Link from "next/link";
import { AreaShell } from "@/components/area-shell";

export default function PublicPage() {
  return (
    <AreaShell
      eyebrow="Oeffentlich"
      title="Oeffentlicher Bereich"
      description="Dieser Bereich ist ohne Anmeldung erreichbar. Kalender- und Buchungsfunktionen folgen spaeter."
      authenticated={false}
    >
      <Link
        href="/login"
        className="mt-10 inline-flex rounded-lg bg-sky-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-sky-400"
      >
        Zum Login
      </Link>
    </AreaShell>
  );
}
