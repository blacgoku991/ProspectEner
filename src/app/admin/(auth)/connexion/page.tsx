import { redirect } from "next/navigation";
import { AuthCard } from "@/components/admin/AuthCard";
import { getCurrentSession } from "@/lib/auth/guards";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const s = await getCurrentSession();
  if (s?.session.mfaVerifiedAt) redirect("/admin");
  const { suite } = await searchParams;
  const next = typeof suite === "string" && /^\/admin(\/[\w\-/]*)?$/.test(suite) ? suite : "/admin";
  return (
    <AuthCard title="Espace réservé" subtitle="Accès limité aux personnes habilitées. Les connexions sont journalisées.">
      <LoginForm next={next} />
    </AuthCard>
  );
}
