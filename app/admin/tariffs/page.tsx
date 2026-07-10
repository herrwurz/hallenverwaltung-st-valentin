import { AdminBackLink } from "@/components/admin-back-link";
import { AdminFeedback } from "@/components/admin-feedback";
import { TariffManager } from "@/components/tariff-manager";
import { requirePermission } from "@/lib/permissions";
import { getTariffAdministrationData } from "@/lib/services/admin/tariff-service";

type PageProps = {
  searchParams: Promise<{ saved?: string; error?: string; roomId?: string; tariffGroupId?: string }>;
};

export default async function TariffsPage({ searchParams }: PageProps) {
  await requirePermission("MANAGE_TARIFFS");
  const [params, data] = await Promise.all([searchParams, getTariffAdministrationData()]);

  return (
    <>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Stammdaten</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Tarife</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Jede Organisation gehört zu genau einer Tarifgruppe. Der Preis einer Buchung ergibt sich aus Raum,
        Tarifgruppe und Tagesart. Ohne Angabe von Nutzungstyp oder Organisationsart gilt ein Tarif für alle;
        spezifischere Tarife gehen vor. Feiertage verwenden automatisch den Wochenendtarif, falls kein eigener
        Feiertagstarif existiert. Auf einen Eintrag klicken, um ihn zu bearbeiten.
      </p>
      <AdminBackLink />
      <div className="mt-8">
        <AdminFeedback {...params} />
      </div>

      <TariffManager data={data} />
    </>
  );
}

