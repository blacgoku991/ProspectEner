import { Download, Search } from "lucide-react";
import Link from "next/link";
import { WORK_CATEGORY_LABELS } from "@/engine";
import type { WorkCategory } from "@/engine/types";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { buildRequestWhere, callbackState, orderByFor, parseListFilters } from "@/lib/admin/requests";
import { canExport, requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { OUTCOME_LABELS, STATUS_LABELS } from "@/lib/requests/shared";
import { cn } from "@/lib/cn";

export const metadata = { title: "Demandes" };

const PAGE_SIZE = 25;
const date = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

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
  const filters = parseListFilters(sp);
  const page = filters.page ?? 1;
  const where = buildRequestWhere(filters, ctx.user, ctx.settings);
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
        status: true,
        channel: true,
        kind: true,
        callbackDeadline: true,
        firstContactAt: true,
        isDemo: true,
        anonymizedAt: true,
        oppositionMatch: true,
        assignedTo: { select: { displayName: true } },
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
          <input id="q" name="q" defaultValue={filters.q} placeholder="Nom, référence, commune, tél." className="field-input py-2.5 pl-9 text-sm" />
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
        <select name="channel" defaultValue={filters.channel ?? ""} aria-label="Canal" className="field-input py-2.5 text-sm">
          <option value="">Tous canaux</option>
          <option value="PHONE">Rappel téléphonique</option>
          <option value="EMAIL">E-mail</option>
        </select>
        <select name="assigned" defaultValue={filters.assigned ?? ""} aria-label="Assignation" className="field-input py-2.5 text-sm">
          <option value="">Toutes assignations</option>
          <option value="me">Assignées à moi</option>
          <option value="none">Non assignées</option>
          {ctx.user.role === "ADMIN" && staff.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
        </select>
        <select name="sort" defaultValue={filters.sort ?? "recent"} aria-label="Tri" className="field-input py-2.5 text-sm">
          <option value="recent">Plus récentes</option>
          <option value="oldest">Plus anciennes</option>
          <option value="deadline">Échéance de rappel</option>
          <option value="status">Statut</option>
        </select>
        <div className="flex flex-wrap items-center gap-2 md:col-span-4 xl:col-span-8">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            Du <input type="date" name="from" defaultValue={filters.from} className="field-input w-auto py-2 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            au <input type="date" name="to" defaultValue={filters.to} className="field-input w-auto py-2 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" name="open" value="1" defaultChecked={filters.open === "1"} className="size-4 accent-pine-600" /> En cours uniquement
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" name="demo" value="1" defaultChecked={filters.demo === "1"} className="size-4 accent-pine-600" /> Démo uniquement
          </label>
          <select name="deadline" defaultValue={filters.deadline ?? ""} aria-label="Échéance" className="field-input w-auto py-2 text-sm">
            <option value="">Toutes échéances</option>
            <option value="soon">Rappel à échéance (≤ 2 jours)</option>
            <option value="overdue">Délai de rappel dépassé</option>
          </select>
          <button className="btn-dark py-2.5">Filtrer</button>
          <Link href="/admin/demandes" className="text-sm font-semibold text-ink-600 underline">Réinitialiser</Link>
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState>Aucune demande ne correspond à ces critères.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-900/[0.06] bg-white shadow-soft">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-ink-900/[0.06] bg-sand-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                <th scope="col" className="px-4 py-3 font-semibold">Nom</th>
                <th scope="col" className="px-4 py-3 font-semibold">Commune</th>
                <th scope="col" className="px-4 py-3 font-semibold">Projet</th>
                <th scope="col" className="px-4 py-3 font-semibold">Résultat indicatif</th>
                <th scope="col" className="px-4 py-3 font-semibold">Statut</th>
                <th scope="col" className="px-4 py-3 font-semibold">Assigné à</th>
                <th scope="col" className="px-4 py-3 font-semibold">Rappel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/[0.05]">
              {rows.map((r) => {
                const cb = callbackState(r, ctx.settings);
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
                    <td className="max-w-[220px] px-4 py-3 text-ink-700">{r.projectTypes.map((p) => WORK_CATEGORY_LABELS[p as WorkCategory] ?? p).join(", ")}</td>
                    <td className="px-4 py-3"><span className={cn("badge", OUTCOME_CLASS[r.overallOutcome])}>{OUTCOME_LABELS[r.overallOutcome]}</span></td>
                    <td className="px-4 py-3 text-ink-800">{STATUS_LABELS[r.status]}</td>
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
