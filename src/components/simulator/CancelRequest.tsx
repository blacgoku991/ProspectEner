"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { useHashParams } from "@/lib/use-browser";

/** Annulation par le visiteur : référence + code issus du lien (fragment d'URL, jamais envoyé dans les journaux serveur). */
export function CancelRequest() {
  const params = useHashParams();
  const initialRef = params.get("ref") ?? "";
  const initialToken = params.get("t") ?? "";
  return <CancelForm key={`${initialRef}:${initialToken}`} initialRef={initialRef} initialToken={initialToken} />;
}

function CancelForm({ initialRef, initialToken }: { initialRef: string; initialToken: string }) {
  const id = useId();
  const [reference, setReference] = useState(initialRef);
  const [token, setToken] = useState(initialToken);
  const [deleteData, setDeleteData] = useState(false);
  const [oppose, setOppose] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [already, setAlready] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/requests/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference: reference.trim().toUpperCase(), token: token.trim(), deleteData, oppose }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; alreadyCancelled?: boolean };
      if (res.ok) {
        setAlready(Boolean(data.alreadyCancelled));
        setState("done");
        return;
      }
      setMessage(data.message ?? "L'annulation n'a pas abouti.");
    } catch {
      setMessage("Connexion impossible. Merci de réessayer.");
    }
    setState("idle");
  }

  if (state === "done") {
    return (
      <div className="card p-6 sm:p-8" role="status">
        <CheckCircle2 className="size-10 text-pine-600" aria-hidden />
        <h2 className="mt-3 text-2xl font-bold text-ink-900">{already ? "Cette demande était déjà annulée" : "Votre demande est annulée"}</h2>
        <p className="mt-2 text-ink-600">
          Vous ne serez pas contacté(e) au titre de cette demande.
          {deleteData ? " Vos coordonnées ont été effacées ; seule une preuve non nominative de la demande est conservée pour la durée légale." : ""}
          {oppose ? " Votre opposition à être recontacté(e) a été enregistrée." : ""}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-ref`} className="field-label">Référence de la demande</label>
          <input id={`${id}-ref`} required className="field-input font-mono uppercase" placeholder="PE-XXXX-XXXX" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-tok`} className="field-label">Code d&apos;annulation</label>
          <input id={`${id}-tok`} required className="field-input font-mono text-xs" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
          <p className="field-help">Il figure dans le lien fourni après l&apos;envoi de votre demande.</p>
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm text-ink-700">
        <input type="checkbox" className="mt-0.5 size-5 accent-pine-600" checked={deleteData} onChange={(e) => setDeleteData(e.target.checked)} />
        Effacer également mes coordonnées et mon commentaire dès maintenant.
      </label>
      <label className="flex items-start gap-3 text-sm text-ink-700">
        <input type="checkbox" className="mt-0.5 size-5 accent-pine-600" checked={oppose} onChange={(e) => setOppose(e.target.checked)} />
        Je m&apos;oppose à être recontacté(e) à l&apos;avenir (mon numéro ou mon adresse est ajouté, sous forme d&apos;empreinte non réversible, à la liste d&apos;opposition).
      </label>
      {message && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{message}</p>}
      <button type="submit" disabled={state === "sending"} className="btn bg-red-600 text-white hover:bg-red-700">
        {state === "sending" && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Annuler ma demande de contact
      </button>
    </form>
  );
}
