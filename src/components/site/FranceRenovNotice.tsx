import { ExternalLink, Landmark } from "lucide-react";
import { FRANCE_RENOV_NOTICE, FRANCE_RENOV_REDIRECT_URL } from "@/lib/legal/texts";
import { cn } from "@/lib/cn";

/**
 * Message d'information prévu par l'art. L122-26 du Code de la consommation
 * (arrêté du 7 juillet 2026) + lien de redirection vers le service public.
 */
export function FranceRenovNotice({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <aside
      data-france-renov-notice
      aria-label="Information du service public France Rénov'"
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        tone === "light" ? "border-sky-soft bg-sky-soft/40 text-ink-800" : "border-white/15 bg-white/5 text-white/85",
        className,
      )}
    >
      <Landmark className={cn("mt-0.5 size-4 shrink-0", tone === "light" ? "text-ink-600" : "text-white/70")} aria-hidden />
      <p>
        {FRANCE_RENOV_NOTICE.replace("www.france-renov.gouv.fr", "")}
        <a
          href={FRANCE_RENOV_REDIRECT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("inline-flex items-center gap-1 font-semibold underline underline-offset-2", tone === "light" ? "text-ink-900" : "text-white")}
        >
          www.france-renov.gouv.fr
          <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only">(nouvel onglet, site du service public)</span>
        </a>
      </p>
    </aside>
  );
}
