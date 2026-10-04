import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert, BarList, Panel, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { toggleChannelAction } from "./actions";
import { ChannelForm } from "./ChannelForm";

export const metadata = { title: "Acquisition" };

const ORIGINS: Record<string, string> = {
  DIRECT: "Demandes spontanées (sans campagne)",
  AUTHORIZED_CAMPAIGN: "Campagnes déclarées comme autorisées",
  UNLISTED_CAMPAIGN: "Campagnes non déclarées (à contrôler)",
  NOT_COLLECTED: "Source non collectée",
};

export default async function AcquisitionPage() {
  const ctx = await requireAdmin();
  const [channels, byOrigin, byCampaign] = await Promise.all([
    prisma.acquisitionChannel.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.contactRequest.groupBy({ by: ["acquisitionOrigin"], _count: { _all: true } }),
    prisma.contactRequest.groupBy({ by: ["utmCampaign"], where: { utmCampaign: { not: null } }, _count: { _all: true }, orderBy: { _count: { utmCampaign: "desc" } }, take: 15 }),
  ]);
  return (
    <>
      <PageHeader
        title="Acquisition"
        subtitle="Déclarez les campagnes autorisées (paramètres utm). Les paramètres ne doivent jamais contenir d'e-mail, de téléphone ou d'identifiant personnel : ils sont filtrés à la collecte."
      />
      <div className="mb-6">
        <Alert tone="info">
          Le site n&apos;intègre aucun système de démarchage : la prospection commerciale par téléphone, SMS, messagerie, e-mail ou réseau social est
          interdite pour la rénovation énergétique, y compris avec un consentement (art. L223-1 et L223-8 du Code de la consommation). Seuls des
          canaux où la personne vient d&apos;elle-même (annonces, référencement, contenus) sont à déclarer ici.
          {!ctx.settings.acquisition.collectCampaignParams && " La collecte des paramètres de campagne est actuellement désactivée (Paramètres)."}
        </Alert>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Origine des demandes">
          <BarList data={Object.entries(ORIGINS).map(([k, label]) => ({ label, value: byOrigin.find((o) => o.acquisitionOrigin === k)?._count._all ?? 0 }))} />
        </Panel>
        <Panel title="Campagnes les plus fréquentes">
          <BarList data={byCampaign.map((c) => ({ label: c.utmCampaign ?? "—", value: c._count._all }))} emptyLabel="Aucune demande issue d'une campagne." />
        </Panel>
      </div>
      <Panel title="Déclarer un canal autorisé" className="mt-6">
        <ChannelForm />
      </Panel>
      <Panel title="Canaux déclarés" className="mt-6">
        {channels.length === 0 ? (
          <p className="text-sm text-ink-500">Aucun canal déclaré : toute demande avec des paramètres de campagne sera marquée « à contrôler ».</p>
        ) : (
          <ul className="divide-y divide-ink-900/[0.06]">
            {channels.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold text-ink-900">{c.label} <span className="font-mono text-xs text-ink-500">{[c.source, c.medium, c.campaign].filter(Boolean).join(" / ")}</span></p>
                  {c.authorizationNote && <p className="text-xs text-ink-600">{c.authorizationNote}</p>}
                </div>
                <form action={toggleChannelAction} className="flex items-center gap-3">
                  <input type="hidden" name="id" value={c.id} />
                  <span className={c.active ? "badge bg-pine-100 text-pine-800" : "badge bg-sand-200 text-ink-600"}>{c.active ? "Actif" : "Désactivé"}</span>
                  <SubmitButton variant="ghost" className="py-1.5 text-xs">{c.active ? "Désactiver" : "Réactiver"}</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
