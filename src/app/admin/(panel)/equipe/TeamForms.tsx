"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { createUserAction, resetAccessAction, type TeamState, updateUserAction } from "./actions";

function Result({ state }: { state: TeamState }) {
  if (state.error) return <p role="alert" className="text-sm font-medium text-red-700">{state.error}</p>;
  if (!state.ok) return null;
  return (
    <div role="status" className="space-y-2 rounded-xl bg-pine-50 p-3 text-sm text-pine-900">
      <p>{state.ok}</p>
      {state.link && <input readOnly value={state.link} onFocus={(e) => e.currentTarget.select()} className="field-input font-mono text-xs" aria-label="Lien d'activation" />}
    </div>
  );
}

export function CreateUserForm() {
  const [state, action] = useActionState<TeamState, FormData>(createUserAction, {});
  return (
    <form action={action} className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto_auto] md:items-end">
      <label className="text-sm">Nom<input name="displayName" required className="field-input mt-1 py-2.5 text-sm" /></label>
      <label className="text-sm">E-mail<input name="email" type="email" required className="field-input mt-1 py-2.5 text-sm" /></label>
      <label className="text-sm">Rôle
        <select name="role" className="field-input mt-1 py-2.5 text-sm" defaultValue="COLLABORATOR">
          <option value="COLLABORATOR">Collaborateur</option>
          <option value="ADMIN">Administrateur</option>
        </select>
      </label>
      <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="canExport" className="size-4 accent-pine-600" /> Export CSV</label>
      <SubmitButton className="py-2.5">Inviter</SubmitButton>
      <div className="md:col-span-5"><Result state={state} /></div>
    </form>
  );
}

export function UserRow({ user, isSelf }: { user: { id: string; role: string; canExport: boolean; isActive: boolean }; isSelf: boolean }) {
  const [state, action] = useActionState<TeamState, FormData>(updateUserAction, {});
  const [resetState, resetAction] = useActionState<TeamState, FormData>(resetAccessAction, {});
  return (
    <div className="space-y-2">
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="id" value={user.id} />
        <select name="role" defaultValue={user.role} aria-label="Rôle" className="field-input w-auto py-1.5 text-sm" disabled={isSelf}>
          <option value="COLLABORATOR">Collaborateur</option>
          <option value="ADMIN">Administrateur</option>
        </select>
        {isSelf && <input type="hidden" name="role" value={user.role} />}
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="canExport" defaultChecked={user.canExport} className="size-4 accent-pine-600" /> Export</label>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="isActive" defaultChecked={user.isActive} disabled={isSelf} className="size-4 accent-pine-600" /> Actif</label>
        {isSelf && <input type="hidden" name="isActive" value="on" />}
        <SubmitButton variant="ghost" className="py-1.5 text-xs">Enregistrer</SubmitButton>
      </form>
      {!isSelf && (
        <form action={resetAction}>
          <input type="hidden" name="id" value={user.id} />
          <SubmitButton variant="ghost" className="py-1.5 text-xs" confirm="Réinitialiser le mot de passe et la double authentification de ce compte ?">Réinitialiser les accès</SubmitButton>
        </form>
      )}
      <Result state={state} />
      <Result state={resetState} />
    </div>
  );
}
