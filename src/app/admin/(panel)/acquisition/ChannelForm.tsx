"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { type AcqState, saveChannelAction } from "./actions";

export function ChannelForm() {
  const [state, action] = useActionState<AcqState, FormData>(saveChannelAction, {});
  return (
    <form action={action} className="grid gap-3 md:grid-cols-3">
      <label className="text-sm">utm_campaign (obligatoire)<input name="campaign" required className="field-input mt-1 py-2.5 font-mono text-sm" /></label>
      <label className="text-sm">utm_source<input name="source" className="field-input mt-1 py-2.5 font-mono text-sm" /></label>
      <label className="text-sm">utm_medium<input name="medium" className="field-input mt-1 py-2.5 font-mono text-sm" /></label>
      <label className="text-sm md:col-span-1">Libellé<input name="label" required className="field-input mt-1 py-2.5 text-sm" placeholder="Annonces moteur de recherche" /></label>
      <label className="text-sm md:col-span-2">Justification de l&apos;autorisation<input name="authorizationNote" className="field-input mt-1 py-2.5 text-sm" placeholder="Campagne d'annonces validée le …, aucune prospection téléphonique ni par message" /></label>
      <div className="md:col-span-3">
        <SubmitButton className="py-2.5">Enregistrer le canal</SubmitButton>
        {state.error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{state.error}</p>}
        {state.ok && <p role="status" className="mt-2 text-sm font-medium text-pine-700">{state.ok}</p>}
      </div>
    </form>
  );
}
