import { Panel, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { CreateUserForm, UserRow } from "./TeamForms";

export const metadata = { title: "Équipe" };

const dt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function TeamPage() {
  const ctx = await requireAdmin();
  const users = await prisma.staffUser.findMany({ orderBy: [{ isActive: "desc" }, { displayName: "asc" }] });
  return (
    <>
      <PageHeader
        title="Équipe"
        subtitle={`Administrateurs : accès complet et double authentification obligatoire. Collaborateurs : accès aux demandes qui leur sont assignées${ctx.settings.security.collaboratorsSeeUnassigned ? " et aux demandes non assignées" : ""}${ctx.settings.security.requireMfaForCollaborators ? ", double authentification obligatoire" : ""}.`}
      />
      <Panel title="Inviter une personne" className="mb-6">
        <CreateUserForm />
        <p className="mt-3 text-xs text-ink-500">Aucun mot de passe n&apos;est transmis : la personne choisit le sien via le lien d&apos;activation, puis active la double authentification.</p>
      </Panel>
      <div className="space-y-3">
        {users.map((u) => (
          <Panel key={u.id}>
            <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
              <div>
                <p className="font-semibold text-ink-900">{u.displayName} {u.id === ctx.user.id && <span className="text-xs font-normal text-ink-500">(vous)</span>}</p>
                <p className="text-sm text-ink-600">{u.email}</p>
                <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  <span className={u.isActive ? "badge bg-pine-100 text-pine-800" : "badge bg-sand-200 text-ink-600"}>{u.isActive ? "Actif" : "Désactivé"}</span>
                  <span className={u.mfaEnabledAt ? "badge bg-pine-100 text-pine-800" : "badge bg-amber-100 text-amber-900"}>{u.mfaEnabledAt ? "2FA active" : "2FA non activée"}</span>
                  {!u.passwordHash && <span className="badge bg-amber-100 text-amber-900">Activation en attente</span>}
                  {u.lockedUntil && u.lockedUntil > new Date() && <span className="badge bg-red-100 text-red-800">Verrouillé</span>}
                </p>
                <p className="mt-1 text-xs text-ink-500">Dernière connexion : {u.lastLoginAt ? dt.format(u.lastLoginAt) : "jamais"}</p>
              </div>
              <UserRow user={{ id: u.id, role: u.role, canExport: u.canExport, isActive: u.isActive }} isSelf={u.id === ctx.user.id} />
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
