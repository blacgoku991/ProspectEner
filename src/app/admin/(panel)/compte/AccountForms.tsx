"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { type AccountState, changePasswordAction, regenerateCodesAction } from "./actions";

function Feedback({ state }: { state: AccountState }) {
  return (
    <>
      {state.error && <p role="alert" className="text-sm font-medium text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm font-medium text-pine-700">{state.ok}</p>}
      {state.codes && (
        <ul className="grid grid-cols-2 gap-2 rounded-xl bg-sand-100 p-3 font-mono text-sm sm:grid-cols-5">
          {state.codes.map((c) => <li key={c}>{c}</li>)}
        </ul>
      )}
    </>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<AccountState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="grid gap-3 md:grid-cols-3">
      <label className="text-sm">Mot de passe actuel<input name="current" type="password" autoComplete="current-password" required className="field-input mt-1 py-2.5 text-sm" /></label>
      <label className="text-sm">Nouveau mot de passe<input name="next" type="password" autoComplete="new-password" required minLength={12} className="field-input mt-1 py-2.5 text-sm" /></label>
      <label className="text-sm">Confirmation<input name="confirm" type="password" autoComplete="new-password" required className="field-input mt-1 py-2.5 text-sm" /></label>
      <div className="space-y-2 md:col-span-3"><SubmitButton className="py-2.5">Modifier le mot de passe</SubmitButton><Feedback state={state} /></div>
    </form>
  );
}

export function RecoveryForm() {
  const [state, action] = useActionState<AccountState, FormData>(regenerateCodesAction, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block max-w-xs text-sm">Code de votre application d&apos;authentification<input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className="field-input mt-1 py-2.5 text-center tracking-[0.3em]" /></label>
      <SubmitButton variant="ghost" className="py-2.5">Générer de nouveaux codes de récupération</SubmitButton>
      <Feedback state={state} />
    </form>
  );
}
