"use client";

import { Loader2, Send } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { transmitRequestedAction } from "../actions";

const nf = (n: number) => n.toLocaleString("fr-FR");
const demandes = (n: number) => `${nf(n)} demande${n > 1 ? "s" : ""}`;

/** Téléchargement du fichier reçu de l'action (aucune copie conservée dans la page). */
function download(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Transmission des nouvelles demandes qui nomment l'entreprise, en deux temps : l'équipe confirme
 * « Je transmets ces N demandes à … », puis seules ces demandes, si elles sont encore transmissibles,
 * sont marquées comme transmises et téléchargées. Les compteurs de la page sont ensuite rechargés.
 */
export function TransmitRequested({ partnerId, partnerName, ids, otherName }: { partnerId: string; partnerName: string; ids: string[]; otherName: number }) {
  const uid = useId();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const n = ids.length;

  const transmit = () =>
    startTransition(async () => {
      const res = await transmitRequestedAction(partnerId, ids);
      setConfirming(false);
      if (res.error || !res.csv || !res.filename) {
        setMessage({ tone: "error", text: res.error ?? "La transmission n'a pas abouti : rechargez la page puis recommencez." });
        return;
      }
      download(res.csv, res.filename);
      const count = res.count ?? 0;
      const skipped = res.skipped ?? 0;
      setMessage({
        tone: "ok",
        text:
          `${demandes(count)} marquée${count > 1 ? "s" : ""} comme transmise${count > 1 ? "s" : ""} à ${partnerName} : le fichier a été téléchargé.` +
          (skipped > 0 ? ` ${demandes(skipped)} n'étai${skipped > 1 ? "ent" : "t"} plus à transmettre et ${skipped > 1 ? "ont été écartées" : "a été écartée"}.` : "") +
          " Si le téléchargement n'a pas démarré, utilisez « Télécharger à nouveau les demandes déjà transmises ».",
      });
    });

  return (
    <div className="w-full space-y-3">
      {n > 0 && !confirming && (
        <button
          type="button"
          className="btn-primary py-2.5"
          onClick={() => {
            setMessage(null);
            setConfirming(true);
          }}
        >
          <Send className="size-4" aria-hidden /> {n > 1 ? `Transmettre les ${nf(n)} nouvelles demandes…` : "Transmettre la nouvelle demande…"}
        </button>
      )}
      {n > 0 && confirming && (
        <div role="group" aria-labelledby={`${uid}-title`} className="rounded-xl border border-pine-600/30 bg-pine-50 p-4 text-sm text-ink-800">
          <p id={`${uid}-title`} className="font-semibold text-ink-900">
            Je transmets {n > 1 ? `ces ${nf(n)} demandes` : "cette demande"} à {partnerName}.
          </p>
          <p className="mt-1 max-w-2xl text-ink-700">
            {n > 1 ? "Elles seront marquées" : "Elle sera marquée"} comme transmise{n > 1 ? "s" : ""}, avec la date, dans leur historique, et le fichier
            (coordonnées et réponses) sera téléchargé : envoyez-le uniquement à cette entreprise. Une demande devenue close, à vérifier ou en
            opposition, ou dont le délai de rappel est dépassé, est écartée.
          </p>
          {otherName > 0 && (
            <p className="mt-2 max-w-2xl font-medium text-amber-900">
              {otherName > 1 ? `${nf(otherName)} de ces demandes nomment` : "Une de ces demandes nomme"} l&apos;entreprise sous un autre nom que son nom
              actuel (colonne « Nom à la demande ≠ nom actuel ») : vérifiez qu&apos;il s&apos;agit bien de la même entreprise.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary py-2.5" disabled={pending} onClick={transmit}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
              Je transmets {n > 1 ? `ces ${nf(n)} demandes` : "cette demande"} à {partnerName}
            </button>
            <button type="button" className="btn-ghost py-2.5" disabled={pending} onClick={() => setConfirming(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={message.tone === "error" ? "text-sm font-medium text-red-700" : "text-sm font-medium text-pine-800"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
