import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { CancelRequest } from "@/components/simulator/CancelRequest";

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await pageMetadata({ title: "Annuler une demande", description: "Annuler une demande de contact envoyée depuis ce site.", path: "/annulation" })),
    robots: { index: false, follow: false },
  };
}

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
