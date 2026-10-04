import { redirect } from "next/navigation";
import { AuthCard } from "@/components/admin/AuthCard";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { getCurrentSession } from "@/lib/auth/guards";
import { dismissRecoveryCodesAction, readFreshRecoveryCodes } from "../../actions";

export default async function RecoveryCodesPage() {
  const s = await getCurrentSession();
  if (!s?.session.mfaVerifiedAt) redirect("/admin/connexion");
  const codes = await readFreshRecoveryCodes();
  if (!codes) redirect("/admin");
  return (
    <AuthCard title="Double authentification activée" subtitle="Conservez vos codes de récupération en lieu sûr.">
      <div className="space-y-4">
        <p className="text-sm text-ink-700">
          Chacun de ces <strong>codes de récupération</strong> permet une seule connexion si vous perdez l&apos;accès à votre application
          d&apos;authentification. Ils ne seront plus affichés.
        </p>
        <ul className="grid grid-cols-2 gap-2 rounded-2xl bg-sand-100 p-4 font-mono text-sm text-ink-900">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <form action={dismissRecoveryCodesAction}>
          <SubmitButton className="w-full py-3.5">J&apos;ai conservé mes codes — continuer</SubmitButton>
        </form>
      </div>
    </AuthCard>
  );
}
