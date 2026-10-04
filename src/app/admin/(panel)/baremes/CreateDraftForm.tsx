"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createDraftAction, type DraftState } from "./actions";

export function CreateDraftForm({ suggestion }: { suggestion: string }) {
  const [state, action] = useActionState<DraftState, FormData>(createDraftAction, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="version" className="field-label">Nouvelle version</label>
        <input id="version" name="version" defaultValue={suggestion} className="field-input w-44 py-2.5 font-mono text-sm" required />
      </div>
      <SubmitButton className="py-2.5">Créer un brouillon</SubmitButton>
      {state.error && <p role="alert" className="w-full text-sm font-medium text-red-700">{state.error}</p>}
    </form>
  );
}
