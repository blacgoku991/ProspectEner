import Link from "next/link";
import { FRANCE_RENOV_URL, INDEPENDENCE_DISCLAIMER, NO_STATE_DATA_NOTICE } from "@/lib/legal/texts";
import type { PublicConfig } from "@/lib/public-config";
import { FranceRenovNotice } from "./FranceRenovNotice";

export interface FooterLink {
  label: string;
  href: string;
}

function LinkColumn({ title, links }: { title: string; links: FooterLink[] }) {
  if (links.length === 0) return null;
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-white">{title}</p>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link className="hover:text-white" href={l.href}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer({ config, aidLinks, workLinks }: { config: PublicConfig; aidLinks: FooterLink[]; workLinks: FooterLink[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-ink-950 text-white/75">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="space-y-4 sm:col-span-2 lg:col-span-1">
          <p className="font-display text-xl font-bold text-white">{config.brandName}</p>
          <p className="max-w-md text-sm leading-relaxed text-white/70">
            {INDEPENDENCE_DISCLAIMER} {NO_STATE_DATA_NOTICE}
          </p>
          <FranceRenovNotice tone="dark" />
        </div>
        <LinkColumn title="Les aides" links={[{ label: "Le guide des aides", href: "/aides" }, ...aidLinks]} />
        <LinkColumn title="Par travaux" links={workLinks} />
        <div>
          <p className="mb-3 text-sm font-semibold text-white">Le service</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link className="hover:text-white" href="/simulation">
                Tester mon éligibilité
              </Link>
            </li>
            {config.quickCallbackOpen && (
              <li>
                <Link className="hover:text-white" href="/rappel">
                  Être recontacté(e)
                </Link>
              </li>
            )}
            <li>
              <Link className="hover:text-white" href="/methodologie">
                Méthode et sources
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" href="/contact">
                Contact
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" href="/annulation">
                Annuler une demande
              </Link>
            </li>
            <li>
              <a className="hover:text-white" href={FRANCE_RENOV_URL} target="_blank" rel="noopener noreferrer">
                France Rénov&apos; (service public)
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-5 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {config.companyName || "Éditeur du site"} — Résultats indicatifs, sans valeur de décision d&apos;attribution d&apos;une aide.
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            <li>
              <Link className="hover:text-white" href="/mentions-legales">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" href="/confidentialite">
                Confidentialité
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" href="/cookies">
                Cookies et préférences
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
