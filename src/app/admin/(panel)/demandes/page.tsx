import { Download, Handshake, Search } from "lucide-react";
import Link from "next/link";
import { WORK_CATEGORY_LABELS } from "@/engine";
import type { WorkCategory } from "@/engine/types";
import { IncomeBadge } from "@/components/admin/IncomeBadge";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import {
  buildRequestWhere,
  callbackState,
  installationSummary,
  orderByFor,
  parisYear,
  parseListFilters,
  resolvePartnerFilter,
} from "@/lib/admin/requests";
import { canExport, requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import type { Evaluation } from "@/engine/types";
import { describeCriteria, matchPartner } from "@/lib/leads/partners";
import { listPartners } from "@/lib/leads/partners-db";
import { INCOME_CATEGORIES, INCOME_PROFILE, LEAD_PROFILE_SELECT, leadProfileFromRow } from "@/lib/leads/profile";
import { DISPOSITIF_SHORT_LABELS, OUTCOME_LABELS, STATUS_LABELS } from "@/lib/requests/shared";
import { cn } from "@/lib/cn";

export const metadata = { title: "Demandes" };

const PAGE_SIZE = 25;
const date = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const appointmentDate = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

const OUTCOME_CLASS: Record<string, string> = {
  POTENTIALLY_ELIGIBLE: "bg-pine-100 text-pine-800",
  NEEDS_REVIEW: "bg-amber-100 text-amber-900",
  NOT_ELIGIBLE: "bg-ink-900/[0.06] text-ink-700",
  OUT_OF_SCOPE: "bg-sky-soft text-ink-800",
  NOT_EVALUATED: "bg-sand-200 text-ink-700",
};

export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const activePartners = await listPartners({ activeOnly: true });
  // Entreprise inconnue ou désactivée : filtre ignoré (et retiré des liens de pagination et d'export).
  const { filters, partner } = await resolvePartnerFilter(parseListFilters(sp), activePartners);
  const page = filters.page ?? 1;
  const now = new Date();
  const year = parisYear(now);
  const where = buildRequestWhere(filters, ctx.user, ctx.settings, now, partner?.criteria);
  const [total, rows, staff] = await Promise.all([
    prisma.contactRequest.count({ where }),
    prisma.contactRequest.findMany({
      where,
      orderBy: orderByFor(filters.sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        reference: true,
        createdAt: true,
        firstName: true,
        lastName: true,
        communeName: true,
        postalCode: true,
        projectTypes: true,
        overallOutcome: true,
        evaluation: true,
        status: true,
        channel: true,
        kind: true,
        callbackDeadline: true,
        firstContactAt: true,
        appointmentAt: true,
        requestedPartnerId: true,
        isDemo: true,
        anonymizedAt: true,
        oppositionMatch: true,
        assignedTo: { select: { displayName: true } },
        ...LEAD_PROFILE_SELECT,
      },
    }),
    prisma.staffUser.findMany({ where: { isActive: true }, select: { id: true, displayName: true }, orderBy: { displayName: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, page: undefined, ...patch })) if (v !== undefined && v !== "") params.set(k, String(v));
    const s = params.toString();
    return s ? `?${s}` : "";
  };
  const exportQs = qs({ page: undefined, sort: undefined });

  return (
    <>
      <PageHeader
        title="Demandes"
        subtitle={`${total.toLocaleString("fr-FR")} demande(s) correspondant aux filtres.`}
        actions={
          canExport(ctx.user) ? (
            <a href={`/admin/demandes/export${exportQs}`} className="btn-ghost">
              <Download className="size-4" aria-hidden /> Export CSV
            </a>
          ) : undefined
        }
      />

      <form className="mb-5 grid gap-3 rounded-2xl border border-ink-900/[0.06] bg-white p-4 shadow-soft md:grid-cols-4 xl:grid-cols-8" role="search">
        <div className="relative md:col-span-2">
          <label htmlFor="q" className="sr-only">Rechercher</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <input id="q" name="q" defaultValue={filters.q} placeholder="Nom, référence, commune, adresse, tél." className="field-input py-2.5 pl-9 text-sm" />
        </div>
        <select name="status" defaultValue={filters.status ?? ""} aria-label="Statut" className="field-input py-2.5 text-sm">
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="outcome" defaultValue={filters.outcome ?? ""} aria-label="Résultat" className="field-input py-2.5 text-sm">
          <option value="">Tous résultats</option>
          {Object.entries(OUTCOME_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="work" defaultValue={filters.work ?? ""} aria-label="Travaux" className="field-input py-2.5 text-sm">
          <option value="">Tous travaux</option>
          {Object.entries(WORK_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="revenus" defaultValue={filters.revenus ?? ""} aria-label="Revenus" className="field-input py-2.5 text-sm">
          <option value="">Tous revenus</option>
          {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{INCOME_PROFILE[c].label}</option>)}
          <option value="INCONNU">Revenus non renseignés</option>
        </select>
        <select
          name="partenaire"
          defaultValue={filters.partenaire ?? ""}
          aria-label="Entreprise partenaire"
          disabled={activePartners.length === 0}
          className="field-input py-2.5 text-sm"
        >
          <option value="">{activePartners.length === 0 ? "Aucune entreprise partenaire" : "Toutes entreprises"}</option>
          {activePartners.map((p) => <option key={p.id} value={p.id}>Pour {p.name}</option>)}
        </select>
        <select name="assigned" defaultValue={filters.assigned ?? ""} aria-label="Assignation" className="field-input py-2.5 text-sm">
          <option value="">Toutes assignations</option>
          <option value="me">Assignées à moi</option>
          <option value="none">Non assignées</option>
          {ctx.user.role === "ADMIN" && staff.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
        </select>
        <div className="flex flex-wrap items-center gap-2 md:col-span-4 xl:col-span-8">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            Du <input type="date" name="from" defaultValue={filters.from} className="field-input w-auto py-2 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            au <input type="date" name="to" defaultValue={filters.to} className="field-input w-auto py-2 text-sm" />
          </label>
          <select name="channel" defaultValue={filters.channel ?? ""} aria-label="Canal" className="field-input w-auto py-2 text-sm">
            <option value="">Tous canaux</option>
            <option value="PHONE">Rappel téléphonique</option>
            <option value="EMAIL">E-mail</option>
          </select>
          <select name="deadline" defaultValue={filters.deadline ?? ""} aria-label="Échéance" className="field-input w-auto py-2 text-sm">
            <option value="">Toutes échéances</option>
            <option value="soon">Rappel à échéance (≤ 2 jours)</option>
            <option value="overdue">Délai de rappel dépassé</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" name="open" value="1" defaultChecked={filters.open === "1"} className="size-4 accent-pine-600" /> En cours uniquement
          </label>
          {activePartners.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-ink-700" title="Avec une entreprise choisie : seulement les demandes qui la nomment">
              <input type="checkbox" name="nommee" value="1" defaultChecked={filters.nommee === "1"} className="size-4 accent-pine-600" /> Entreprise
              nommée dans la demande
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" name="demo" value="1" defaultChecked={filters.demo === "1"} className="size-4 accent-pine-600" /> Démo uniquement
          </label>
          <select name="sort" defaultValue={filters.sort ?? "recent"} aria-label="Tri" className="field-input w-auto py-2 text-sm">
            <option value="recent">Plus récentes</option>
            <option value="oldest">Plus anciennes</option>
            <option value="deadline">Échéance de rappel</option>
            <option value="status">Statut</option>
          </select>
          <button className="btn-dark py-2.5">Filtrer</button>
          <Link href="/admin/demandes" className="text-sm font-semibold text-ink-600 underline">Réinitialiser</Link>
        </div>
      </form>

      {partner && (
        <section aria-label={`Tri pour ${partner.name}`} className="mb-5 rounded-2xl border border-pine-600/20 bg-pine-50/70 p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold text-pine-950">
                <Handshake className="size-4 text-pine-700" aria-hidden />{" "}
                {filters.nommee ? `Demandes qui nomment ${partner.name}` : `Demandes pour ${partner.name}`}
              </p>
              <p className="mt-1 text-ink-700">{describeCriteria(partner.criteria).join(" · ")}</p>
            </div>
            {ctx.user.role === "ADMIN" && (
              <Link href={`/admin/partenaires/${partner.id}`} className="text-sm font-semibold text-pine-700 underline">
                Critères de l&apos;entreprise
              </Link>
            )}
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
            <span><span className="badge bg-pine-600 px-1.5 py-0 text-[11px] text-white">Demandée</span> l&apos;entreprise est nommée dans la demande</span>
            <span><span className="badge bg-pine-100 px-1.5 py-0 text-[11px] text-pine-800">Correspond</span> tous les critères sont remplis</span>
            <span><span className="badge bg-amber-100 px-1.5 py-0 text-[11px] text-amber-900">À vérifier</span> une réponse manque : à confirmer avec la personne</span>
            <span>Demandes anonymisées exclues.</span>
          </p>
        </section>
      )}

      {rows.length === 0 ? (
        <EmptyState>Aucune demande ne correspond à ces critères.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-900/[0.06] bg-white shadow-soft">
          <table className={cn("w-full text-left text-sm", partner ? "min-w-[1100px]" : "min-w-[980px]")}>
            <thead className="border-b border-ink-900/[0.06] bg-sand-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                <th scope="col" className="px-4 py-3 font-semibold">Nom</th>
                <th scope="col" className="px-4 py-3 font-semibold">Commune</th>
                <th scope="col" className="px-4 py-3 font-semibold">Projet et revenus</th>
                {partner && <th scope="col" className="px-4 py-3 font-semibold">Critères</th>}
                <th scope="col" className="px-4 py-3 font-semibold">Résultat indicatif</th>
                <th scope="col" className="px-4 py-3 font-semibold">Statut</th>
                <th scope="col" className="px-4 py-3 font-semibold">Assigné à</th>
                <th scope="col" className="px-4 py-3 font-semibold">Rappel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/[0.05]">
              {rows.map((r) => {
                const cb = callbackState(r, ctx.settings, now);
                const profile = leadProfileFromRow(r);
                const installation = installationSummary(profile);
                const match = partner ? matchPartner(profile, partner.criteria, year) : null;
                const toCheck = match ? match.checks.filter((c) => c.status !== "OK").map((c) => c.label) : [];
                return (
                  <tr key={r.id} className="group hover:bg-sand-50">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-600">
                      <Link href={`/admin/demandes/${r.id}`} className="font-medium text-ink-900 group-hover:underline">{date.format(r.createdAt)}</Link>
                      <span className="block font-mono text-[11px] text-ink-400">{r.reference}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/demandes/${r.id}`} className="font-semibold text-ink-900 hover:underline">
                        {r.anonymizedAt ? <em className="font-normal text-ink-400">Anonymisé</em> : [r.firstName, r.lastName].filter(Boolean).join(" ")}
                      </Link>
                      <span className="mt-0.5 flex flex-wrap gap-1">
                        {r.isDemo && <span className="badge bg-violet-100 px-1.5 py-0 text-[10px] text-violet-800">Démo</span>}
                        {r.oppositionMatch && <span className="badge bg-red-100 px-1.5 py-0 text-[10px] text-red-800">Opposition</span>}
                        {r.kind === "QUICK_CALLBACK" && <span className="badge bg-sand-200 px-1.5 py-0 text-[10px] text-ink-700">Rappel rapide</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{r.communeName ?? r.postalCode ?? "—"}</td>
                    <td className="max-w-[280px] px-4 py-3 text-ink-700">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <IncomeBadge category={profile.incomeCategory} className="px-1.5 py-0 text-[11px]" />
                        {r.projectTypes.length > 0 ? (
                          <span>{r.projectTypes.map((p) => WORK_CATEGORY_LABELS[p as WorkCategory] ?? p).join(", ")}</span>
                        ) : (
                          <span className="text-ink-400">À préciser</span>
                        )}
                      </span>
                      {installation && <span className="mt-1 block text-xs text-ink-500">{installation}</span>}
                    </td>
                    {match && (
                      <td className="px-4 py-3">
                        {partner && r.requestedPartnerId === partner.id && (
                          <span className="badge mb-1 mr-1 bg-pine-600 text-white" title="Entreprise nommée dans la demande, avant l'envoi">
                            Demandée
                          </span>
                        )}
                        {match.status === "MATCH" ? (
                          <span className="badge bg-pine-100 text-pine-800">Correspond</span>
                        ) : match.status === "TO_CHECK" ? (
                          <span className="badge bg-amber-100 text-amber-900">À vérifier</span>
                        ) : (
                          <span className="badge bg-ink-900/[0.06] text-ink-700">Ne correspond pas</span>
                        )}
                        {toCheck.length > 0 && <span className="mt-1 block max-w-[160px] text-xs text-ink-500">{toCheck.join(", ")}</span>}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={cn("badge", OUTCOME_CLASS[r.overallOutcome])}>{OUTCOME_LABELS[r.overallOutcome]}</span>
                      {(() => {
                        const aids = ((r.evaluation as unknown as Evaluation | null)?.results ?? [])
                          .filter((x) => x.status === "POTENTIALLY_ELIGIBLE")
                          .map((x) => DISPOSITIF_SHORT_LABELS[x.id]);
                        return aids.length > 0 ? <span className="mt-1 block text-xs text-ink-500">{aids.join(" · ")}</span> : null;
                      })()}
                    </td>
                    <td className="px-4 py-3 text-ink-800">
                      {STATUS_LABELS[r.status]}
                      {r.status === "RDV_FIXE" && r.appointmentAt && (
                        <span className="mt-1 block text-xs font-semibold text-pine-700">{appointmentDate.format(r.appointmentAt)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-700">{r.assignedTo?.displayName ?? <span className="text-ink-400">—</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {r.channel === "EMAIL" ? (
                        <span className="text-ink-500">E-mail</span>
                      ) : cb.state === "OVERDUE" ? (
                        <span className="badge bg-red-100 text-red-800">Délai dépassé</span>
                      ) : cb.state === "SOON" ? (
                        <span className="badge bg-amber-100 text-amber-900">{cb.remaining} j. ouvr.</span>
                      ) : cb.state === "IN_WINDOW" ? (
                        <span className="text-ink-600">{cb.remaining} j. ouvr.</span>
                      ) : cb.state === "CONTACTED" ? (
                        <span className="text-pine-700">Contacté</span>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-5 flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-ink-600">Page {page} sur {pages}</span>
          <span className="flex gap-2">
            {page > 1 && <Link className="btn-ghost py-2" href={qs({ page: String(page - 1) })}>Précédente</Link>}
            {page < pages && <Link className="btn-ghost py-2" href={qs({ page: String(page + 1) })}>Suivante</Link>}
          </span>
        </nav>
      )}
    </>
  );
}
