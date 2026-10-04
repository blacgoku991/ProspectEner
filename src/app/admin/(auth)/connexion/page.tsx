import { redirect } from "next/navigation";
import { AuthCard } from "@/components/admin/AuthCard";
import { getCurrentSession } from "@/lib/auth/guards";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ suite?: string; inactif?: string }> }) {
  const s = await getCurrentSession();
  if (s?.session.mfaVerifiedAt) redirect("/admin");
  const { suite, inactif } = await searchParams;
  const next = typeof suite === "string" && /^\/admin(\/[\w\-/]*)?$/.test(suite) ? suite : "/admin";
  return (
    <AuthCard title="Espace réservé" subtitle="Accès limité aux personnes habilitées. Les connexions sont journalisées.">
      {inactif === "1" && (
        <p role="status" className="mb-4 rounded-xl bg-sand-100 px-4 py-3 text-sm text-ink-800">
          Vous avez été déconnecté(e) après 30 minutes d&apos;inactivité, pour protéger les données affichées.
        </p>
      )}
      <LoginForm next={next} />
    </AuthCard>
  );
}
