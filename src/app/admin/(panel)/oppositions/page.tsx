import { SubmitButton } from "@/components/admin/SubmitButton";
import { EmptyState, Panel, PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { removeOppositionAction } from "./actions";
import { AddOppositionForm } from "./AddOppositionForm";

export const metadata = { title: "Oppositions" };

const SOURCES: Record<string, string> = { VISITOR_CANCELLATION: "Annulation par la personne", STAFF: "Saisie par l'équipe" };
const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });

export default async function OppositionsPage() {
  const ctx = await requireStaff();
  const rows = await prisma.opposition.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  return (
    <>
      <PageHeader
        title="Liste d'opposition"
        subtitle={`Personnes ne souhaitant plus être contactées. Seules des empreintes non réversibles et des valeurs masquées sont conservées (${ctx.settings.retention.oppositionMonths} mois). Une nouvelle demande explicite d'une personne listée est signalée sur sa fiche.`}
      />
      <Panel title="Enregistrer une opposition" className="mb-6">
        <AddOppositionForm />
      </Panel>
      {rows.length === 0 ? (
        <EmptyState>Aucune opposition enregistrée.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-900/[0.06] bg-white shadow-soft">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-ink-900/[0.06] bg-sand-50 text-xs uppercase tracking-wide text-ink-500">
              <tr><th className="px-4 py-3">Contact (masqué)</th><th className="px-4 py-3">Origine</th><th className="px-4 py-3">Enregistrée le</th><th className="px-4 py-3">Expire le</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody className="divide-y divide-ink-900/[0.05]">
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-mono">{o.maskedValue}</td>
                  <td className="px-4 py-3 text-ink-700">{SOURCES[o.source] ?? o.source}{o.note ? <span className="block text-xs text-ink-500">{o.note}</span> : null}</td>
                  <td className="px-4 py-3 text-ink-600">{date.format(o.createdAt)}</td>
                  <td className="px-4 py-3 text-ink-600">{o.expiresAt ? date.format(o.expiresAt) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {ctx.user.role === "ADMIN" && (
                      <form action={removeOppositionAction}>
                        <input type="hidden" name="id" value={o.id} />
                        <SubmitButton variant="ghost" className="py-1.5 text-xs" confirm="Retirer cette opposition ? (uniquement à la demande expresse de la personne)">Retirer</SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
