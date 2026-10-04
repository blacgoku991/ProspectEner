import { SubmitButton } from "@/components/admin/SubmitButton";
import { Panel, PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { revokeSessionAction } from "./actions";
import { PasswordForm, RecoveryForm } from "./AccountForms";

export const metadata = { title: "Mon compte" };

const dt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function AccountPage() {
  const ctx = await requireStaff();
  const sessions = await prisma.staffSession.findMany({
    where: { userId: ctx.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
  });
  return (
    <>
      <PageHeader title="Mon compte" subtitle={`${ctx.user.displayName} · ${ctx.user.email} · ${ctx.user.role === "ADMIN" ? "Administrateur" : "Collaborateur"}`} />
      <div className="space-y-6">
        <Panel title="Mot de passe"><PasswordForm /></Panel>
        <Panel title="Double authentification">
          <p className="mb-3 text-sm text-ink-600">
            {ctx.user.mfaEnabledAt ? `Active depuis le ${dt.format(ctx.user.mfaEnabledAt)}. Codes de récupération restants : ${ctx.user.recoveryCodeHashes.length}.` : "Non activée."}
          </p>
          {ctx.user.mfaEnabledAt && <RecoveryForm />}
        </Panel>
        <Panel title="Sessions ouvertes">
          <ul className="divide-y divide-ink-900/[0.06]">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="block font-medium text-ink-900">{s.userAgent?.slice(0, 80) ?? "Navigateur inconnu"}</span>
                  <span className="text-xs text-ink-500">Ouverte le {dt.format(s.createdAt)} · dernière activité {dt.format(s.lastSeenAt)}{s.id === ctx.session.id ? " · session actuelle" : ""}</span>
                </span>
                {s.id !== ctx.session.id && (
                  <form action={revokeSessionAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <SubmitButton variant="ghost" className="py-1.5 text-xs">Fermer</SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
