import { ArrowLeft, ArrowRight, Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert, Panel, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { criteriaNeedReview, hasNoCriteria } from "@/lib/leads/partners";
import { getPartner, partnerDisplayName } from "@/lib/leads/partners-db";
import { pendingRequestedLeads } from "@/lib/leads/requested-partner";
import { deletePartnerAction, togglePartnerAction } from "../actions";
import { formValuesFrom } from "../form";
import { PartnerForm } from "../PartnerForm";
import { matchingWhere, partnerNameInUse, requestedCounts, requestedRedownloadHref, transmittedWhere } from "../queries";
import { TransmitRequested } from "./TransmitRequested";

export const metadata = { title: "Entreprise partenaire" };

const nf = (n: number) => n.toLocaleString("fr-FR");

export default async function PartnerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const partner = z.uuid().safeParse(id).success ? await getPartner(id) : null;
  if (!partner) notFound();
  const now = new Date();
  const [matching, transmitted, counts, toTransmit, nameLocked] = await Promise.all([
    prisma.contactRequest.count({ where: matchingWhere(partner.criteria) }),
    prisma.contactRequest.count({ where: transmittedWhere(partner) }),
    requestedCounts(partner.id, now),
    pendingRequestedLeads(partner, now),
    partnerNameInUse(partner),
  ]);
  const displayName = partnerDisplayName(partner);
  const needsReview = criteriaNeedReview(partner.criteria);
  return (
    <>
      <PageHeader
        title={partner.name}
        subtitle={
          <>
            {partner.active ? "Entreprise active" : "Entreprise désactivée"} · {nf(matching)} demande{matching > 1 ? "s" : ""} correspondante
            {matching > 1 ? "s" : ""} · {nf(transmitted)} rendez-vous transmis
          </>
        }
        actions={
          <>
            <Link href="/admin/partenaires" className="btn-ghost py-2.5">
              <ArrowLeft className="size-4" aria-hidden /> Entreprises partenaires
            </Link>
            {/* Le filtre de la liste ignore les entreprises désactivées : pas de lien trompeur. */}
            {partner.active && (
              <Link href={`/admin/demandes?partenaire=${partner.id}`} className="btn-ghost py-2.5">
                Voir les demandes <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
            <a href={`/admin/partenaires/${partner.id}/export`} className="btn-ghost py-2.5">
              <Download className="size-4" aria-hidden /> Exporter les rendez-vous transmis (CSV)
            </a>
          </>
        }
      />
      {needsReview && (
        <div className="mb-6">
          <Alert tone="critical">
            Critères à revoir : les critères enregistrés pour cette entreprise sont illisibles (valeur inconnue ou supprimée). Elle n&apos;est nommée
            dans aucune demande et n&apos;apparaît dans aucun tri tant que sa fiche n&apos;a pas été vérifiée puis enregistrée ci-dessous.
          </Alert>
        </div>
      )}
      {!partner.active && hasNoCriteria(partner.criteria) && (
        <div className="mb-6">
          <Alert tone="warning">
            Entreprise désactivée, sans critère : réactivée telle quelle, elle pourrait être nommée dans toutes les demandes. Indiquez d&apos;abord les
            demandes qui l&apos;intéressent ci-dessous, puis réactivez-la.
          </Alert>
        </div>
      )}
      <Panel title="Demandes qui la nomment" className="mb-6">
        <div id="transmettre" className="scroll-mt-6 space-y-4">
          <div>
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-sans text-2xl font-semibold tabular-nums text-ink-950">{nf(counts.requested)}</span>
              <span className={counts.pending > 0 ? "text-sm font-semibold text-pine-800" : "text-sm text-ink-600"}>dont {nf(counts.pending)} à transmettre</span>
              <span className="text-sm text-ink-600">· {nf(counts.sent)} déjà transmise{counts.sent > 1 ? "s" : ""}</span>
              {counts.blocked > 0 && (
                <span className="text-sm text-amber-800">
                  · {nf(counts.blocked)} non transmissible{counts.blocked > 1 ? "s" : ""} (délai dépassé, demande close, à vérifier ou opposition)
                </span>
              )}
            </p>
            <p className="mt-1 max-w-2xl text-sm text-ink-600">
              La personne a nommé l&apos;entreprise dans sa demande, avant l&apos;envoi : la demande peut lui être transmise, à elle seule. Elle doit
              rappeler dans le délai indiqué (compté depuis la demande, pas depuis la transmission), uniquement au sujet du projet demandé. Une demande
              close, à vérifier, dont le contact s&apos;est opposé ou dont le délai de rappel est dépassé n&apos;est pas transmise, ni proposée à
              nouveau au téléchargement : ne l&apos;envoyez pas par un autre moyen.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {partner.active && counts.requested > 0 && (
              <Link href={`/admin/demandes?partenaire=${partner.id}&nommee=1`} className="btn-ghost py-2.5">
                Voir les demandes qui la nomment <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
            {counts.resendable > 0 && (
              <a href={requestedRedownloadHref(partner.id)} className="btn-ghost py-2.5">
                <Download className="size-4" aria-hidden /> Télécharger à nouveau les demandes déjà transmises (CSV)
              </a>
            )}
          </div>
          {partner.active ? (
            <TransmitRequested partnerId={partner.id} partnerName={displayName} ids={toTransmit.ids} otherName={toTransmit.otherName} />
          ) : (
            counts.pending > 0 && <p className="text-sm text-ink-600">Entreprise désactivée : réactivez-la pour lui transmettre ces demandes.</p>
          )}
        </div>
      </Panel>
      <Panel>
        <PartnerForm partnerId={partner.id} initial={formValuesFrom(partner)} nameLocked={nameLocked} submitLabel="Enregistrer les modifications" />
      </Panel>
      <Panel title="Désactiver ou supprimer" className="mt-6">
        <div className="space-y-4 text-sm text-ink-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl">
              Une entreprise désactivée n&apos;est plus nommée dans les demandes, ne peut plus se voir confier de rendez-vous et n&apos;est plus citée
              dans les pages légales ; sa fiche et son historique restent consultables ici.
            </p>
            <form action={togglePartnerAction}>
              <input type="hidden" name="id" value={partner.id} />
              <SubmitButton
                variant="ghost"
                className="py-2"
                confirm={
                  !partner.active && hasNoCriteria(partner.criteria)
                    ? `Réactiver « ${partner.name} » sans critère ? Elle pourra être nommée dans toutes les demandes.`
                    : undefined
                }
              >
                {partner.active ? "Désactiver l'entreprise" : "Réactiver l'entreprise"}
              </SubmitButton>
            </form>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-900/[0.06] pt-4">
            <p className="max-w-2xl">
              La suppression retire définitivement cette fiche. Les demandes et les rendez-vous déjà confiés ne sont pas modifiés : ils gardent le nom de
              l&apos;entreprise annoncé à la personne.
            </p>
            <form action={deletePartnerAction}>
              <input type="hidden" name="id" value={partner.id} />
              <SubmitButton variant="danger" className="py-2" confirm={`Supprimer définitivement l'entreprise « ${partner.name} » ? Les demandes ne sont pas modifiées.`}>
                Supprimer l&apos;entreprise
              </SubmitButton>
            </form>
          </div>
        </div>
      </Panel>
    </>
  );
}
