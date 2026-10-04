import Link from "next/link";
import { FRANCE_RENOV_URL, INDEPENDENCE_DISCLAIMER, NO_STATE_DATA_NOTICE } from "@/lib/legal/texts";
import type { PublicConfig } from "@/lib/public-config";
import { FranceRenovNotice } from "./FranceRenovNotice";

export function Footer({ config }: { config: PublicConfig }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-ink-950 text-white/80">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <p className="font-display text-xl font-bold text-white">{config.brandName}</p>
          <p className="max-w-md text-sm leading-relaxed text-white/70">{INDEPENDENCE_DISCLAIMER} {NO_STATE_DATA_NOTICE}</p>
          <FranceRenovNotice tone="dark" />
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Le service</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/simulation">Tester mon éligibilité</Link></li>
            <li><Link className="hover:text-white" href="/rappel">Demander à être recontacté</Link></li>
            <li><Link className="hover:text-white" href="/methodologie">Méthode et sources</Link></li>
            <li><Link className="hover:text-white" href="/annulation">Annuler une demande</Link></li>
            <li>
              <a className="hover:text-white" href={FRANCE_RENOV_URL} target="_blank" rel="noopener noreferrer">
                France Rénov&apos; (service public)
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Informations</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/mentions-legales">Mentions légales</Link></li>
            <li><Link className="hover:text-white" href="/confidentialite">Confidentialité</Link></li>
            <li><Link className="hover:text-white" href="/cookies">Cookies et préférences</Link></li>
            <li><Link className="hover:text-white" href="/contact">Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-5 text-xs text-white/50">
          © {year} {config.companyName || "Éditeur du site"} — Résultats indicatifs, sans valeur de décision d&apos;attribution d&apos;une aide.
        </p>
      </div>
    </footer>
  );
}
