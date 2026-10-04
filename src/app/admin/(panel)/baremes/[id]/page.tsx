import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STATUS_META } from "@/components/evaluation/EvaluationDetails";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert, Panel, PageHeader } from "@/components/admin/ui";
import { DISPOSITIF_INFO, evaluate, REFERENCE_SCENARIOS, validateRuleSetData, type DispositifId, type RuleSet } from "@/engine";
import { requireStaff } from "@/lib/auth/guards";
import { parisToday } from "@/lib/business-days";
import { prisma } from "@/lib/db";
import { getPublishedRuleSet } from "@/lib/rulesets";
import { cn } from "@/lib/cn";
import { deleteDraftAction } from "../actions";
import { CeilingsForm, DispositifsForm, JsonForm, PublishForm } from "./DraftForms";

export const metadata = { title: "Barème" };

const IDS: DispositifId[] = ["MPR_GESTE", "MPR_AMPLEUR", "CEE", "ECO_PTZ"];
const SHORT: Record<string, string> = {
  POTENTIALLY_ELIGIBLE: "Pot. éligible",
  NEEDS_REVIEW: "À vérifier",
  NOT_ELIGIBLE: "Non rempli",
  OUT_OF_SCOPE: "Hors périmètre",
  NOT_CONCERNED: "Non concerné",
};

export default async function RuleSetPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const row = await prisma.ruleSet.findUnique({ where: { id } });
  if (!row) notFound();
  const v = validateRuleSetData(row.data);
  const published = await getPublishedRuleSet();
  const isDraft = row.status === "DRAFT";
  const isAdmin = ctx.user.role === "ADMIN";
  const refDate = parisToday();

  const preview =
    v.ok && isDraft
      ? REFERENCE_SCENARIOS.map((s) => {
          const draftRs: RuleSet = { version: row.version, data: v.data };
          const a = evaluate(s.answers, published, refDate);
          const b = evaluate(s.answers, draftRs, refDate);
          return {
            scenario: s,
            cells: IDS.map((dId) => ({
              id: dId,
              before: a.results.find((r) => r.id === dId)?.status ?? "NOT_CONCERNED",
              after: b.results.find((r) => r.id === dId)?.status ?? "NOT_CONCERNED",
            })),
            outcomeBefore: a.outcome,
            outcomeAfter: b.outcome,
          };
        })
      : null;
  const changes = preview?.reduce((n, p) => n + p.cells.filter((c) => c.before !== c.after).length, 0) ?? 0;

  return (
    <>
      <Link href="/admin/baremes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900">
        <ArrowLeft className="size-4" aria-hidden /> Barèmes
      </Link>
      <PageHeader
        title={`Barème ${row.version}`}
        subtitle={`${row.status === "DRAFT" ? "Brouillon" : row.status === "PUBLISHED" ? "Version publiée (en vigueur)" : "Version archivée"} · moteur ${row.engineVersion}${row.publicationNote ? ` · ${row.publicationNote}` : ""}`}
      />
      {!v.ok && (
        <div className="mb-6">
          <Alert tone="critical">
            Ce barème ne respecte pas le schéma attendu : {v.errors.slice(0, 5).join(" ; ")}
          </Alert>
        </div>
      )}

      {preview && (
        <Panel title={`Prévisualisation : version publiée ${published.version} → brouillon (${changes} différence(s))`} className="mb-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th scope="col" className="py-2 pr-3">Scénario de référence</th>
                  {IDS.map((d) => <th key={d} scope="col" className="py-2 pr-3">{DISPOSITIF_INFO[d].name}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/[0.05]">
                {preview.map((p) => (
                  <tr key={p.scenario.id}>
                    <td className="py-2 pr-3 text-ink-700">{p.scenario.label}</td>
                    {p.cells.map((c) => (
                      <td key={c.id} className={cn("py-2 pr-3", c.before !== c.after && "bg-amber-50")}>
                        {c.before === c.after ? (
                          <span className="text-ink-600">{SHORT[c.after]}</span>
                        ) : (
                          <span className="font-semibold text-amber-900">
                            {SHORT[c.before]} → {SHORT[c.after]}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink-500">Évaluation au {refDate}. Légende : {Object.values(STATUS_META).map((m) => m.label).join(" · ")}.</p>
        </Panel>
      )}

      {v.ok && isDraft && isAdmin ? (
        <div className="space-y-6">
          <Panel title="Plafonds de ressources">
            <CeilingsForm id={row.id} data={v.data} />
          </Panel>
          <Panel title="Dispositifs : ouverture, vérification, validité">
            <DispositifsForm id={row.id} data={v.data} />
          </Panel>
          <Panel title="Édition avancée (JSON complet : travaux couverts, conditions, sources…)">
            <JsonForm id={row.id} json={JSON.stringify(v.data, null, 2)} />
          </Panel>
          <Panel title="Publication">
            <PublishForm id={row.id} />
            <form action={deleteDraftAction} className="mt-4">
              <input type="hidden" name="id" value={row.id} />
              <SubmitButton variant="ghost" confirm="Supprimer ce brouillon ?">Supprimer le brouillon</SubmitButton>
            </form>
          </Panel>
        </div>
      ) : (
        <Panel title="Contenu (lecture seule)">
          <p className="mb-3 text-sm text-ink-600">Les versions publiées ou archivées ne sont jamais modifiées : créez un brouillon pour préparer une évolution.</p>
          <pre className="max-h-[600px] overflow-auto rounded-xl bg-ink-950 p-4 text-xs leading-relaxed text-sand-100">{JSON.stringify(row.data, null, 2)}</pre>
        </Panel>
      )}
    </>
  );
}
