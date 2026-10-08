import { ChevronDown, ReceiptText } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Aide repliable des questions « foyer » et « revenus » : où lire le revenu fiscal de référence
 * sur l'avis d'impôt. Le schéma est volontairement générique (aucun logo, aucune mise en page
 * officielle) et ne sert qu'à repérer le cadre « Vos références ». Aucun document n'est demandé.
 */
export function AvisImpotHelp({ question, className }: { question: "householdSize" | "income"; className?: string }) {
  return (
    <details className={cn("group rounded-2xl border border-ink-900/10 bg-sand-50", className)}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-ink-800 transition hover:text-ink-950 [&::-webkit-details-marker]:hidden">
        <ReceiptText className="size-5 shrink-0 text-pine-600" aria-hidden />
        <span className="flex-1">Où trouver ces informations sur mon avis d&apos;impôt ?</span>
        <ChevronDown className="size-4 shrink-0 text-ink-500 transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-4 border-t border-ink-900/[0.06] px-4 pb-5 pt-4 text-sm leading-relaxed text-ink-700">
        <p>
          Le revenu fiscal de référence figure en première page de votre avis d&apos;impôt, dans le cadre « Vos références ». Prenez le
          dernier avis reçu ; si plusieurs avis concernent le foyer (couple non marié, enfant majeur qui fait sa propre déclaration…),
          additionnez leurs revenus fiscaux de référence. Aucun document n&apos;est demandé ici.
        </p>
        {question === "householdSize" && (
          <p>Attention : le « nombre de parts » indiqué sur l&apos;avis n&apos;est pas le nombre de personnes du foyer.</p>
        )}
        <figure className="mx-auto max-w-md">
          <AvisSchema />
          <figcaption className="mt-2 text-center text-xs text-ink-500">Exemple simplifié, sans valeur officielle</figcaption>
        </figure>
      </div>
    </details>
  );
}

/** Schéma neutre d'une première page d'avis : seules les deux lignes utiles sont lisibles. */
function AvisSchema() {
  const placeholder = "fill-ink-900/10";
  return (
    <svg
      viewBox="0 0 340 214"
      role="img"
      aria-label="Schéma simplifié d'une première page d'avis d'impôt : dans le cadre « Vos références », la ligne « Revenu fiscal de référence : 23 450 € » est mise en évidence, sous la ligne « Nombre de parts : 2,5 »."
      className="h-auto w-full"
    >
      {/* Feuille */}
      <rect x="4" y="4" width="332" height="206" rx="12" className="fill-surface stroke-ink-900/20" strokeWidth="1.5" />
      {/* En-tête et adresse, illisibles */}
      <rect x="20" y="20" width="96" height="9" rx="4.5" className="fill-ink-900/20" />
      <rect x="20" y="35" width="64" height="7" rx="3.5" className={placeholder} />
      <rect x="220" y="20" width="100" height="7" rx="3.5" className={placeholder} />
      <rect x="220" y="32" width="80" height="7" rx="3.5" className={placeholder} />
      <rect x="220" y="44" width="90" height="7" rx="3.5" className={placeholder} />
      {/* Cadre « Vos références » */}
      <rect x="12" y="64" width="316" height="124" rx="10" className="fill-sand-100 stroke-ink-900/15" strokeWidth="1.5" />
      <text x="26" y="88" fontSize="14" fontWeight="700" className="fill-ink-900">
        Vos références
      </text>
      <rect x="26" y="98" width="140" height="7" rx="3.5" className={placeholder} />
      <text x="26" y="127" fontSize="13" className="fill-ink-600">
        Nombre de parts :
      </text>
      <text x="312" y="127" fontSize="13" textAnchor="end" className="fill-ink-600">
        2,5
      </text>
      <rect x="18" y="138" width="304" height="34" rx="8" className="fill-pine-500/15 stroke-pine-500" strokeWidth="2" />
      <text x="28" y="160" fontSize="12.5" fontWeight="600" className="fill-ink-950">
        Revenu fiscal de référence :
      </text>
      <text x="312" y="160.5" fontSize="15" fontWeight="800" textAnchor="end" className="fill-ink-950">
        23 450 €
      </text>
      <rect x="26" y="180" width="110" height="6" rx="3" className={placeholder} />
      {/* Suite de la page */}
      <rect x="20" y="198" width="180" height="6" rx="3" className={placeholder} />
      {/* Mention « exemple » en filigrane : le schéma ne doit pas passer pour un document réel */}
      <text
        x="170"
        y="126"
        textAnchor="middle"
        transform="rotate(-12 170 126)"
        fontSize="48"
        fontWeight="800"
        letterSpacing="8"
        className="pointer-events-none fill-ink-900/[0.07]"
      >
        EXEMPLE
      </text>
    </svg>
  );
}
