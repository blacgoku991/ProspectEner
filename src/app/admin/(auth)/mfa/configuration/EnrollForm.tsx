"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { confirmEnrollmentAction, type FormState } from "../../actions";

export function EnrollForm({ qrDataUrl, secret }: { qrDataUrl: string; secret: string }) {
  const [state, action] = useActionState<FormState, FormData>(confirmEnrollmentAction, {});
  return (
    <form action={action} className="space-y-5">
      <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-700">
        <li>Scannez ce QR code avec une application d&apos;authentification (TOTP).</li>
        <li>Saisissez le code à 6 chiffres affiché pour confirmer.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt="QR code d'enrôlement de la double authentification" width={220} height={220} className="mx-auto rounded-xl border border-ink-900/10" />
      <details className="text-sm text-ink-600">
        <summary className="cursor-pointer">Saisie manuelle de la clé</summary>
        <p className="mt-2 break-all rounded-lg bg-sand-100 p-3 font-mono text-xs">{secret}</p>
      </details>
      <div>
        <label htmlFor="code" className="field-label">Code de confirmation</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} className="field-input text-center text-2xl tracking-[0.4em]" />
      </div>
      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>}
      <SubmitButton className="w-full py-3.5">Activer la double authentification</SubmitButton>
    </form>
  );
}
