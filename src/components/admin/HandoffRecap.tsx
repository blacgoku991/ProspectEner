"use client";

import { Check, Copy, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { recordHandoffAction } from "@/app/admin/(panel)/demandes/[id]/actions";

const dts = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

/**
 * Récapitulatif du rendez-vous à transmettre à l'entreprise partenaire (copié puis envoyé par
 * le conseiller) : fiche de la demande, rendez-vous et aides confirmées, construits côté serveur
 * (fiche de la demande, page [id]). La première transmission est tracée dans l'historique de la demande.
 */
export function HandoffRecap({ requestId, partner, text, sentAt }: { requestId: string; partner: string; text: string; sentAt: string | null }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFailed(false);
    } catch {
      setFailed(true);
      return;
    }
    startTransition(async () => {
      await recordHandoffAction(requestId);
      router.refresh();
    });
  };

  return (
    <div className="space-y-2 rounded-xl border border-ink-900/10 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
        <Send className="size-4 text-pine-700" aria-hidden />
        Récapitulatif à transmettre à {partner}
      </p>
      <p className="text-xs text-ink-500">
        Coordonnées et réponses de la personne (dont sa catégorie de revenus), rendez-vous et aides confirmées. Le commentaire libre et les notes internes
        ne sont jamais repris.
      </p>
      <textarea readOnly value={text} rows={Math.min(20, text.split("\n").length + 1)} className="field-input font-mono text-xs" aria-label="Récapitulatif du rendez-vous" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={copy} disabled={pending} className="btn-ghost py-2 text-sm">
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Copié" : "Copier le récapitulatif"}
        </button>
        <span className="text-xs text-ink-500">
          {sentAt ? `Transmis le ${dts.format(new Date(sentAt))}.` : "Copiez-le, puis envoyez-le à l'entreprise : la transmission est notée dans l'historique."}
        </span>
      </div>
      {failed && <p role="alert" className="text-xs font-medium text-red-700">Copie impossible : sélectionnez le texte et copiez-le manuellement.</p>}
    </div>
  );
}
