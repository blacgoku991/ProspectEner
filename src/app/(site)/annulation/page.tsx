import type { Metadata } from "next";
import { CancelRequest } from "@/components/simulator/CancelRequest";

export const metadata: Metadata = { title: "Annuler une demande", robots: { index: false, follow: false } };

export default function CancelPage() {
  return (
    <div className="container-page max-w-2xl py-10 sm:py-14">
      <h1 className="text-3xl font-bold text-ink-950">Annuler une demande de contact</h1>
      <p className="mt-3 text-ink-600">
        Vous pouvez annuler votre demande à tout moment. Si vous n&apos;avez plus votre lien, écrivez-nous en indiquant votre référence (voir la page
        Contact).
      </p>
      <div className="mt-8">
        <CancelRequest />
      </div>
    </div>
  );
}
