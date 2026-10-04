import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata = { title: "Journal d'audit" };

const PAGE = 50;
const dt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Paris" });

const LABELS: Record<string, string> = {
  AUTH_LOGIN_SUCCESS: "Connexion (mot de passe)",
  AUTH_LOGIN_FAILURE: "Échec de connexion",
  AUTH_LOCKED: "Verrouillage / limitation",
  AUTH_LOGOUT: "Déconnexion",
  AUTH_MFA_SUCCESS: "Second facteur validé",
  AUTH_MFA_FAILURE: "Échec du second facteur",
  AUTH_MFA_ENROLLED: "Double authentification activée",
  AUTH_MFA_RESET: "Double authentification réinitialisée",
  AUTH_RECOVERY_CODE_USED: "Code de récupération utilisé",
  AUTH_PASSWORD_CHANGED: "Mot de passe modifié",
  AUTH_SESSION_REVOKED: "Session révoquée",
  ACCESS_DENIED: "Accès refusé",
  REQUEST_VIEWED: "Consultation d'une fiche",
  REQUEST_UPDATED: "Modification d'une fiche",
  REQUEST_ANONYMIZED: "Anonymisation",
  REQUEST_DELETED: "Suppression d'une demande",
  EXPORT_CSV: "Export CSV",
  SETTINGS_UPDATED: "Paramètres modifiés",
  RULESET_DRAFT_SAVED: "Brouillon de barème",
  RULESET_PUBLISHED: "Publication d'un barème",
  USER_CREATED: "Compte créé",
  USER_UPDATED: "Compte modifié",
  USER_SETUP_LINK: "Lien d'activation généré",
  OPPOSITION_ADDED: "Opposition ajoutée",
  OPPOSITION_REMOVED: "Opposition retirée",
  ACQUISITION_UPDATED: "Canal d'acquisition modifié",
  RETENTION_APPLIED: "Politique de conservation appliquée",
  NOTIFICATIONS_RETRIED: "Notifications relancées",
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const action = sp.action && LABELS[sp.action] ? sp.action : undefined;
  const page = Math.max(1, Math.min(10_000, Number(sp.page) || 1));
  const where = action ? { action } : {};
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    prisma.auditLog.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  return (
    <>
      <PageHeader title="Journal d'audit" subtitle="Connexions, accès aux fiches, exports et opérations sensibles. Les adresses IP sont stockées sous forme d'empreinte." />
      <form className="mb-4 flex flex-wrap gap-2">
        <select name="action" defaultValue={action ?? ""} aria-label="Type d'événement" className="field-input w-auto py-2 text-sm">
          <option value="">Tous les événements</option>
          {Object.entries(LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-dark py-2">Filtrer</button>
      </form>
      {rows.length === 0 ? (
        <EmptyState>Aucun événement.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-900/[0.06] bg-white shadow-soft">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-ink-900/[0.06] bg-sand-50 text-xs uppercase tracking-wide text-ink-500">
              <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Événement</th><th className="px-4 py-3">Utilisateur</th><th className="px-4 py-3">Cible</th><th className="px-4 py-3">Détails</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-900/[0.05]">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-ink-600">{dt.format(r.createdAt)}</td>
                  <td className="px-4 py-2.5 font-medium text-ink-900">{LABELS[r.action] ?? r.action}</td>
                  <td className="px-4 py-2.5 text-ink-700">{r.actorLabel ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink-600">
                    {r.targetType === "ContactRequest" && r.targetId && !["REQUEST_DELETED"].includes(r.action) ? (
                      <Link className="text-pine-700 underline" href={`/admin/demandes/${r.targetId}`}>Fiche</Link>
                    ) : (
                      r.targetType ?? "—"
                    )}
                  </td>
                  <td className="max-w-xs truncate px-4 py-2.5 font-mono text-xs text-ink-500" title={r.metadata ? JSON.stringify(r.metadata) : ""}>
                    {r.metadata ? JSON.stringify(r.metadata) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav className="mt-4 flex justify-between text-sm" aria-label="Pagination">
          <span className="text-ink-600">Page {page} / {pages}</span>
          <span className="flex gap-2">
            {page > 1 && <Link className="btn-ghost py-2" href={`?${new URLSearchParams({ ...(action ? { action } : {}), page: String(page - 1) })}`}>Précédente</Link>}
            {page < pages && <Link className="btn-ghost py-2" href={`?${new URLSearchParams({ ...(action ? { action } : {}), page: String(page + 1) })}`}>Suivante</Link>}
          </span>
        </nav>
      )}
    </>
  );
}
