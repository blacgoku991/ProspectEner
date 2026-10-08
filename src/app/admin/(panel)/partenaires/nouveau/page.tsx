import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Alert, Panel, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/guards";
import { HYDRAULIC_HEAT_PUMP_PRESET, partnerCriteriaSchema } from "@/lib/leads/partners";
import { formValuesFrom } from "../form";
import { PartnerForm } from "../PartnerForm";

export const metadata = { title: "Nouvelle entreprise partenaire" };

/** Modèles proposés : critères pré-remplis, à ajuster avant d'enregistrer. */
const MODELS = {
  "pac-air-eau": HYDRAULIC_HEAT_PUMP_PRESET,
} as const;

export default async function NewPartnerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const { modele } = await searchParams;
  const model = typeof modele === "string" && modele in MODELS ? (modele as keyof typeof MODELS) : null;
  const criteria = model ? MODELS[model] : partnerCriteriaSchema.parse({});
  return (
    <>
      <PageHeader
        title="Ajouter une entreprise partenaire"
        subtitle="Indiquez l'entreprise et les demandes qui l'intéressent. Vous pourrez modifier ces critères à tout moment."
        actions={
          <Link href="/admin/partenaires" className="btn-ghost py-2.5">
            <ArrowLeft className="size-4" aria-hidden /> Entreprises partenaires
          </Link>
        }
      />
      {model === "pac-air-eau" ? (
        <div className="mb-6">
          <Alert tone="info">
            Modèle « pompe à chaleur air/eau » : critères pré-remplis pour une entreprise qui remplace une chaudière par une pompe à chaleur sur un
            chauffage central à eau (radiateurs en fonte, en acier ou en aluminium). Ajustez-les à la demande de l&apos;entreprise avant
            d&apos;enregistrer.{" "}
            <Link href="/admin/partenaires/nouveau" className="font-semibold underline underline-offset-2">
              Partir d&apos;une fiche vide
            </Link>
          </Alert>
        </div>
      ) : (
        <p className="mb-6 text-sm text-ink-600">
          Entreprise de pompes à chaleur sur chauffage central à eau ?{" "}
          <Link href="/admin/partenaires/nouveau?modele=pac-air-eau" className="font-semibold text-pine-700 underline underline-offset-2">
            Partir du modèle « pompe à chaleur air/eau »
          </Link>
        </p>
      )}
      <Panel>
        {/* La clé recrée le formulaire quand on change de modèle. */}
        <PartnerForm key={model ?? "vide"} initial={formValuesFrom({ name: "", details: null, active: true, criteria })} submitLabel="Ajouter l'entreprise" />
      </Panel>
    </>
  );
}
