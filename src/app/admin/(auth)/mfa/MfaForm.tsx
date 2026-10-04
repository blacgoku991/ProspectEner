"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { type FormState, verifyMfaAction } from "../actions";

export function MfaForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(verifyMfaAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="suite" value={next} />
      <div>
        <label htmlFor="code" className="field-label">Code à 6 chiffres (ou code de récupération)</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus maxLength={20} className="field-input text-center text-2xl tracking-[0.4em]" />
      </div>
      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>}
      <SubmitButton className="w-full py-3.5">Valider</SubmitButton>
    </form>
  );
}
