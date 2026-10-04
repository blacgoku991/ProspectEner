"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { addOppositionAction, type OppState } from "./actions";

export function AddOppositionForm() {
  const [state, action] = useActionState<OppState, FormData>(addOppositionAction, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="text-sm">Téléphone ou e-mail<input name="value" required className="field-input mt-1 py-2.5 text-sm" autoComplete="off" /></label>
      <label className="text-sm">Origine (facultatif)<input name="note" className="field-input mt-1 py-2.5 text-sm" placeholder="Courrier reçu le…" /></label>
      <SubmitButton className="py-2.5">Ajouter</SubmitButton>
      {state.error && <p role="alert" className="text-sm font-medium text-red-700 sm:col-span-3">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm font-medium text-pine-700 sm:col-span-3">{state.ok}</p>}
    </form>
  );
}
