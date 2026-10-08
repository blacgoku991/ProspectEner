import { ArrowRight, Download, Handshake, LayoutTemplate, Pencil, Plus, Send } from "lucide-react";
import Link from "next/link";
import { IncomeBadge } from "@/components/admin/IncomeBadge";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert, Panel, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { criteriaNeedReview, describeCriteria, hasNoCriteria, type PartnerCriteria } from "@/lib/leads/partners";
import { listPartners, partnerDisplayName } from "@/lib/leads/partners-db";
import { referralEnabled } from "@/lib/settings-schema";
import { togglePartnerAction } from "./actions";
import { matchingWhere, parisYear, requestedCounts, transmitHref, transmittedWhere } from "./queries";

export const metadata = { title: "Partenaires" };

const nf = (n: number) => n.toLocaleString("fr-FR");

/** Critères en clair ; les catégories de revenus sont affichées avec leur couleur. */
function CriteriaList({ criteria }: { criteria: PartnerCriteria }) {
  return (
    <ul className="space-y-1.5 text-sm text-ink-700">
      {describeCriteria(criteria).map((line) => {
        const [label, value] = line.includes(" : ") ? [line.slice(0, line.indexOf(" : ")), line.slice(line.indexOf(" : ") + 3)] : [null, line];
        return (
          <li key={line} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
            {label && <span className="font-medium text-ink-900">{label} :</span>}
            {label === "Revenus" ? (
              <span className="inline-flex flex-wrap gap-1">
                {criteria.incomeCategories.map((c) => (
                  <IncomeBadge key={c} category={c} className="py-0.5" />
                ))}
              </span>
            ) : (
              <span>{value}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default async function PartnersPage() {
  const ctx = await requireAdmin();
  const partners = await listPartners();
  const year = parisYear();
  const now = new Date();
  const stats = await Promise.all(
    partners.map(async (p) => {
      const where = matchingWhere(p.criteria, year);
      const [matching, fresh, transmitted, { requested, pending, blocked }] = await Promise.all([
        prisma.contactRequest.count({ where }),
        prisma.contactRequest.count({ where: { AND: [where, { status: "NOUVEAU" }] } }),
        prisma.contactRequest.count({ where: transmittedWhere(p) }),
        requestedCounts(p.id, now),
      ]);
      return { matching, fresh, transmitted, requested, pending, blocked };
    }),
  );
  // Critères illisibles : entreprise écartée de toutes les demandes jusqu'à la revue de sa fiche.
  const toReview = partners.filter((p) => criteriaNeedReview(p.criteria));
  // Entreprises désactivées sans critère (dont celles reprises de l'ancienne liste libre) : réactivées
  // telles quelles, elles seraient nommées dans toutes les demandes.
  const dormant = partners.filter((p) => !p.active && hasNoCriteria(p.criteria));

  const addButtons = (
    <>
      <Link href="/admin/partenaires/nouveau?modele=pac-air-eau" className="btn-ghost py-2.5">
        <LayoutTemplate className="size-4" aria-hidden /> Partir du modèle « pompe à chaleur air/eau »
      </Link>
      <Link href="/admin/partenaires/nouveau" className="btn-primary py-2.5">
        <Plus className="size-4" aria-hidden /> Ajouter une entreprise
      </Link>
    </>
  );

  return (
    <>
      <PageHeader
        title="Entreprises partenaires"
        subtitle="Une demande n'est transmise qu'à l'entreprise qu'elle nomme (choisie selon ces critères avant l'envoi), ou, avec l'accord de la personne, à l'entreprise du rendez-vous. Les critères servent aussi à trier les demandes."
        actions={partners.length > 0 ? addButtons : undefined}
      />

      {!referralEnabled(ctx.settings) && (
        <div className="mb-6">
          <Alert tone="warning">
            La mise en relation n&apos;est pas déclarée : aucun rendez-vous ne peut être confié à ces entreprises tant que « Mise en relation avec des
            professionnels » n&apos;est pas cochée dans{" "}
            <Link href="/admin/parametres" className="font-semibold underline underline-offset-2">
              Paramètres → Activité
            </Link>{" "}
            (la notice d&apos;information l&apos;annonce alors aux visiteurs).
          </Alert>
        </div>
      )}

      {toReview.length > 0 && (
        <div className="mb-6">
          <Alert tone="critical">
            <p>
              Critères à revoir : les critères enregistrés pour les entreprises ci-dessous sont illisibles (valeur inconnue ou supprimée). Une telle
              entreprise n&apos;est nommée dans aucune demande et n&apos;apparaît dans aucun tri tant que sa fiche n&apos;a pas été vérifiée puis
              enregistrée.
            </p>
            <ul className="mt-1 list-disc pl-5">
              {toReview.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/partenaires/${p.id}`} className="font-semibold underline underline-offset-2">
                    {partnerDisplayName(p)}
                  </Link>
                </li>
              ))}
            </ul>
          </Alert>
        </div>
      )}

      {dormant.length > 0 && (
        <div className="mb-6">
          <Alert tone="warning">
            <p>
              Entreprises désactivées sans critère, notamment celles reprises de l&apos;ancienne liste des partenaires : réactivée telle quelle, une
              entreprise sans critère pourrait être nommée dans toutes les demandes. Ouvrez sa fiche, indiquez les demandes qui l&apos;intéressent, puis
              réactivez-la.
            </p>
            <ul className="mt-1 list-disc pl-5">
              {dormant.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/partenaires/${p.id}`} className="font-semibold underline underline-offset-2">
                    {partnerDisplayName(p)}
                  </Link>
                </li>
              ))}
            </ul>
          </Alert>
        </div>
      )}

      {partners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-900/15 bg-white/60 px-5 py-10 text-center">
          <Handshake className="mx-auto size-8 text-pine-600" aria-hidden />
          <h2 className="mt-3 font-sans text-base font-semibold text-ink-900">Aucune entreprise partenaire</h2>
          <p className="mx-auto mt-1 max-w-xl text-sm text-ink-600">
            Ajoutez les entreprises partenaires, avec les demandes qui les intéressent (travaux, revenus, logement, chauffage, secteur). Une entreprise
            active peut être nommée dans la demande des visiteurs dont les réponses correspondent à ses critères ; un rendez-vous ne lui est confié
            qu&apos;avec l&apos;accord de la personne.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">{addButtons}</div>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {partners.map((p, i) => {
            const s = stats[i] ?? { matching: 0, fresh: 0, transmitted: 0, requested: 0, pending: 0, blocked: 0 };
            const review = criteriaNeedReview(p.criteria);
            return (
              <Panel key={p.id} className="flex flex-col">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-sans text-base font-semibold text-ink-900">
                      <Link href={`/admin/partenaires/${p.id}`} className="hover:text-pine-700">
                        {p.name}
                      </Link>
                    </h2>
                    {p.details && <p className="text-sm text-ink-600">{p.details}</p>}
                  </div>
                  <span className="flex flex-wrap gap-1.5">
                    {review && <span className="badge bg-red-50 text-red-800">Critères à revoir</span>}
                    <span className={p.active ? "badge bg-pine-100 text-pine-800" : "badge bg-sand-200 text-ink-600"}>{p.active ? "Active" : "Désactivée"}</span>
                  </span>
                </div>

                <div className="mt-4">
                  <CriteriaList criteria={p.criteria} />
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-pine-50 p-3 ring-1 ring-inset ring-pine-600/20">
                    <dt className="text-xs text-ink-600">Demandes qui la nomment</dt>
                    <dd className="mt-1">
                      <span className="font-sans text-2xl font-semibold tabular-nums text-ink-950">{nf(s.requested)}</span>
                      <span className={s.pending > 0 ? "ml-2 text-sm font-semibold text-pine-800" : "ml-2 text-sm text-ink-600"}>dont {nf(s.pending)} à transmettre</span>
                      {s.blocked > 0 && (
                        <span className="mt-1 block text-xs text-amber-800">
                          {nf(s.blocked)} non transmissible{s.blocked > 1 ? "s" : ""} (délai dépassé, demande close, à vérifier ou opposition)
                        </span>
                      )}
                      {p.active && s.requested > 0 && (
                        <Link
                          href={`/admin/demandes?partenaire=${p.id}&nommee=1`}
                          className="mt-1 flex items-center gap-1 text-sm font-semibold text-pine-700 hover:text-pine-800"
                        >
                          Voir les demandes qui la nomment <ArrowRight className="size-3.5" aria-hidden />
                        </Link>
                      )}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-sand-100 p-3">
                    <dt className="text-xs text-ink-600">Demandes correspondantes</dt>
                    <dd className="mt-1">
                      <span className="font-sans text-2xl font-semibold tabular-nums text-ink-950">{nf(s.matching)}</span>
                      <span className="ml-2 text-sm text-ink-600">
                        dont {nf(s.fresh)} nouvelle{s.fresh > 1 ? "s" : ""}
                      </span>
                      {p.active ? (
                        <Link href={`/admin/demandes?partenaire=${p.id}`} className="mt-1 flex items-center gap-1 text-sm font-semibold text-pine-700 hover:text-pine-800">
                          Voir ces demandes <ArrowRight className="size-3.5" aria-hidden />
                        </Link>
                      ) : (
                        <span className="mt-1 block text-xs text-ink-500">Réactivez l&apos;entreprise pour filtrer la liste des demandes.</span>
                      )}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-sand-100 p-3">
                    <dt className="text-xs text-ink-600">Rendez-vous transmis</dt>
                    <dd className="mt-1">
                      <span className="font-sans text-2xl font-semibold tabular-nums text-ink-950">{nf(s.transmitted)}</span>
                      <span className="mt-1 block text-xs text-ink-500">Avec l&apos;accord de la personne</span>
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-900/[0.06] pt-4">
                  <Link href={`/admin/partenaires/${p.id}`} className="btn-ghost py-2 text-xs">
                    <Pencil className="size-3.5" aria-hidden /> Modifier
                  </Link>
                  <form action={togglePartnerAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <SubmitButton
                      variant="ghost"
                      className="py-2 text-xs"
                      confirm={!p.active && hasNoCriteria(p.criteria) ? `Réactiver « ${p.name} » sans critère ? Elle pourra être nommée dans toutes les demandes.` : undefined}
                    >
                      {p.active ? "Désactiver" : "Réactiver"}
                    </SubmitButton>
                  </form>
                  {p.active && s.pending > 0 && (
                    <Link href={transmitHref(p.id)} className="btn-ghost py-2 text-xs sm:ml-auto">
                      <Send className="size-3.5" aria-hidden /> {s.pending > 1 ? `Transmettre les ${nf(s.pending)} nouvelles demandes` : "Transmettre la nouvelle demande"}
                    </Link>
                  )}
                  <a href={`/admin/partenaires/${p.id}/export`} className={p.active && s.pending > 0 ? "btn-ghost py-2 text-xs" : "btn-ghost py-2 text-xs sm:ml-auto"}>
                    <Download className="size-3.5" aria-hidden /> Exporter les rendez-vous transmis (CSV)
                  </a>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
