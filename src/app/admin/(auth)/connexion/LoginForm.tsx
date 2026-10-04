"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { type FormState, loginAction } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="suite" value={next} />
      <div>
        <label htmlFor="email" className="field-label">Adresse e-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="field-input" defaultValue={state.email ?? ""} />
      </div>
      <div>
        <label htmlFor="password" className="field-label">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field-input" />
      </div>
      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>}
      <SubmitButton className="w-full py-3.5">Se connecter</SubmitButton>
    </form>
  );
}
