import { ArrowLeft, ArrowRight, Download, Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Panel, PageHeader } from "@/components/admin/ui";
import { canExport, requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getPartner } from "@/lib/leads/partners-db";
import { deletePartnerAction, togglePartnerAction } from "../actions";
import { formValuesFrom } from "../form";
import { PartnerForm } from "../PartnerForm";
import { matchingWhere, requestedCounts, requestedExportHref, transmittedWhere } from "../queries";

export const metadata = { title: "Entreprise partenaire" };

const nf = (n: number) => n.toLocaleString("fr-FR");

export default async function PartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const partner = z.uuid().safeParse(id).success ? await getPartner(id) : null;
  if (!partner) notFound();
  const [matching, transmitted, { requested, pending }] = await Promise.all([
    prisma.contactRequest.count({ where: matchingWhere(partner.criteria) }),
    prisma.contactRequest.count({ where: transmittedWhere(partner) }),
    requestedCounts(partner.id),
  ]);
  const exportAllowed = canExport(ctx.user);
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
            <Link href={`/admin/demandes?partenaire=${partner.id}`} className="btn-ghost py-2.5">
              Voir les demandes <ArrowRight className="size-4" aria-hidden />
            </Link>
            {exportAllowed && (
              <a href={`/admin/partenaires/${partner.id}/export`} className="btn-ghost py-2.5">
                <Download className="size-4" aria-hidden /> Exporter les rendez-vous transmis (CSV)
              </a>
            )}
          </>
        }
      />
      <Panel title="Demandes qui la nomment" className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p>
              <span className="font-sans text-2xl font-semibold tabular-nums text-ink-950">{nf(requested)}</span>
              <span className={pending > 0 ? "ml-2 text-sm font-semibold text-pine-800" : "ml-2 text-sm text-ink-600"}>dont {nf(pending)} à transmettre</span>
            </p>
            <p className="mt-1 max-w-2xl text-sm text-ink-600">
              La personne a nommé l&apos;entreprise dans sa demande, avant l&apos;envoi : la demande peut lui être transmise, à elle seule. Elle doit
              rappeler dans le délai indiqué (compté depuis la demande, pas depuis la transmission), uniquement au sujet du projet demandé.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {partner.active && requested > 0 && (
              <Link href={`/admin/demandes?partenaire=${partner.id}&nommee=1`} className="btn-ghost py-2.5">
                Voir les demandes qui la nomment <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
            {exportAllowed && (
              <a href={requestedExportHref(partner.id)} className="btn-primary py-2.5">
                <Send className="size-4" aria-hidden /> Exporter les demandes à transmettre (CSV)
              </a>
            )}
          </div>
        </div>
      </Panel>
      <Panel>
        <PartnerForm partnerId={partner.id} initial={formValuesFrom(partner)} submitLabel="Enregistrer les modifications" />
      </Panel>
      <Panel title="Désactiver ou supprimer" className="mt-6">
        <div className="space-y-4 text-sm text-ink-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl">
              Une entreprise désactivée ne peut plus se voir confier de rendez-vous et n&apos;est plus citée dans les pages légales ; sa fiche et son
              historique restent consultables ici.
            </p>
            <form action={togglePartnerAction}>
              <input type="hidden" name="id" value={partner.id} />
              <SubmitButton variant="ghost" className="py-2">
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
