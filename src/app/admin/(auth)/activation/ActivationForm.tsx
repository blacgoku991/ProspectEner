"use client";

import { useActionState } from "react";
import { useHashParams } from "@/lib/use-browser";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { activateAccountAction, type FormState } from "../actions";

export function ActivationForm() {
  const token = useHashParams().get("token") ?? "";
  const [state, action] = useActionState<FormState, FormData>(activateAccountAction, {});
  if (!token) return <p className="text-sm text-ink-600">Ouvrez le lien d&apos;activation complet qui vous a été transmis par un administrateur.</p>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="field-label">Choisissez un mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} className="field-input" aria-describedby="pw-help" />
        <p id="pw-help" className="field-help">12 caractères minimum, avec 3 types de caractères — ou une phrase de passe de 16 caractères et plus.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="field-label">Confirmez le mot de passe</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="field-input" />
      </div>
      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>}
      <SubmitButton className="w-full py-3.5">Activer mon compte</SubmitButton>
    </form>
  );
}
