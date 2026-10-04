import { AuthCard } from "@/components/admin/AuthCard";
import { ActivationForm } from "./ActivationForm";

export default function ActivationPage() {
  return (
    <AuthCard title="Activation de votre compte" subtitle="Lien personnel à usage unique, valable 72 heures.">
      <ActivationForm />
    </AuthCard>
  );
}
