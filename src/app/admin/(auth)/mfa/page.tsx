import { redirect } from "next/navigation";
import { AuthCard } from "@/components/admin/AuthCard";
import { requirePendingSession } from "@/lib/auth/guards";
import { logoutAction } from "../actions";
import { MfaForm } from "./MfaForm";

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const s = await requirePendingSession();
  if (s.session.mfaVerifiedAt) redirect("/admin");
  if (!s.user.mfaEnabledAt) redirect("/admin/mfa/configuration");
  const { suite } = await searchParams;
  const next = typeof suite === "string" && /^\/admin(\/[\w\-/]*)?$/.test(suite) ? suite : "/admin";
  return (
    <AuthCard title="Double authentification" subtitle="Saisissez le code affiché par votre application d'authentification.">
      <MfaForm next={next} />
      <form action={logoutAction} className="mt-4 text-center">
        <button className="text-sm text-ink-500 underline">Annuler et se déconnecter</button>
      </form>
    </AuthCard>
  );
}
