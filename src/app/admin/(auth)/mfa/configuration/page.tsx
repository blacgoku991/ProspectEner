import { redirect } from "next/navigation";
import { AuthCard } from "@/components/admin/AuthCard";
import { requirePendingSession } from "@/lib/auth/guards";
import { prepareEnrollment } from "@/lib/auth/enrollment";
import { EnrollForm } from "./EnrollForm";

export default async function MfaSetupPage() {
  const s = await requirePendingSession();
  if (s.user.mfaEnabledAt) redirect(s.session.mfaVerifiedAt ? "/admin" : "/admin/mfa");
  const { qrDataUrl, secret } = await prepareEnrollment();
  return (
    <AuthCard title="Activer la double authentification" subtitle="Obligatoire pour accéder aux demandes et aux données personnelles.">
      <EnrollForm qrDataUrl={qrDataUrl} secret={secret} />
    </AuthCard>
  );
}
