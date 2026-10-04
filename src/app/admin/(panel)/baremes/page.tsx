import Link from "next/link";
import { Panel, PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth/guards";
import { parisToday } from "@/lib/business-days";
import { prisma } from "@/lib/db";
import { getPublishedRuleSet } from "@/lib/rulesets";
import { CreateDraftForm } from "./CreateDraftForm";

export const metadata = { title: "Barèmes & règles" };

const STATUS = { DRAFT: "Brouillon", PUBLISHED: "Publié", ARCHIVED: "Archivé" } as const;
const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function RuleSetsPage() {
  const ctx = await requireStaff();
  await getPublishedRuleSet();
  const rows = await prisma.ruleSet.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: { id: true, version: true, status: true, createdAt: true, publishedAt: true, notes: true, publicationNote: true, engineVersion: true, _count: { select: { requests: true } } },
  });
  const today = parisToday();
  const prefix = `${today.slice(0, 4)}.${today.slice(5, 7)}-`;
  const n = rows.filter((r) => r.version.startsWith(prefix)).length + 1;
  return (
    <>
      <PageHeader
        title="Barèmes & règles"
        subtitle="Chaque modification est préparée dans un brouillon, prévisualisée sur des scénarios de référence puis publiée. Les versions publiées sont immuables et chaque demande conserve la version utilisée."
      />
      {ctx.user.role === "ADMIN" && (
        <Panel className="mb-6" title="Préparer une nouvelle version">
          <CreateDraftForm suggestion={`${prefix}${n}`} />
        </Panel>
      )}
      <div className="overflow-x-auto rounded-2xl border border-ink-900/[0.06] bg-white shadow-soft">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-ink-900/[0.06] bg-sand-50 text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th scope="col" className="px-4 py-3">Version</th>
              <th scope="col" className="px-4 py-3">État</th>
              <th scope="col" className="px-4 py-3">Créée</th>
              <th scope="col" className="px-4 py-3">Publiée</th>
              <th scope="col" className="px-4 py-3">Demandes</th>
              <th scope="col" className="px-4 py-3">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-900/[0.05]">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-sand-50">
                <td className="px-4 py-3 font-mono font-semibold"><Link className="text-pine-700 hover:underline" href={`/admin/baremes/${r.id}`}>{r.version}</Link></td>
                <td className="px-4 py-3">
                  <span className={r.status === "PUBLISHED" ? "badge bg-pine-100 text-pine-800" : r.status === "DRAFT" ? "badge bg-amber-100 text-amber-900" : "badge bg-sand-200 text-ink-700"}>{STATUS[r.status]}</span>
                </td>
                <td className="px-4 py-3 text-ink-600">{date.format(r.createdAt)}</td>
                <td className="px-4 py-3 text-ink-600">{r.publishedAt ? date.format(r.publishedAt) : "—"}</td>
                <td className="px-4 py-3 tabular-nums text-ink-700">{r._count.requests}</td>
                <td className="max-w-sm px-4 py-3 text-ink-600">{r.publicationNote ?? r.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
