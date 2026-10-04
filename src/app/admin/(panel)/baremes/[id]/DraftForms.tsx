"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import type { RuleSetData } from "@/engine/ruleset-schema";
import {
  type DraftState,
  publishDraftAction,
  saveCeilingsAction,
  saveDispositifsAction,
  saveDraftJsonAction,
} from "../actions";

function Feedback({ state }: { state: DraftState }) {
  if (state.ok) return <p role="status" className="rounded-xl bg-pine-50 px-4 py-2 text-sm font-medium text-pine-800">{state.ok}</p>;
  if (!state.error) return null;
  return (
    <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
      <p className="font-semibold">{state.error}</p>
      {state.errors && (
        <ul className="mt-1 list-disc pl-5 font-mono text-xs">
          {state.errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
    </div>
  );
}

const SIZES = ["1 pers.", "2 pers.", "3 pers.", "4 pers.", "5 pers."];
const CATS = ["Très modestes", "Modestes", "Intermédiaires"];

export function CeilingsForm({ id, data }: { id: string; data: RuleSetData }) {
  const [state, action] = useActionState<DraftState, FormData>(saveCeilingsAction, {});
  const ic = data.incomeCeilings;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-sm">Année<input name="year" defaultValue={ic.year} className="field-input mt-1 py-2 text-sm" /></label>
        <label className="text-sm">Valable du<input type="date" name="validFrom" defaultValue={ic.validFrom} className="field-input mt-1 py-2 text-sm" /></label>
        <label className="text-sm">au<input type="date" name="validUntil" defaultValue={ic.validUntil ?? ""} className="field-input mt-1 py-2 text-sm" /></label>
        <label className="text-sm">Vérifié le<input type="date" name="verifiedAt" defaultValue={ic.verification.verifiedAt} className="field-input mt-1 py-2 text-sm" /></label>
      </div>
      {(["IDF", "HORS_IDF"] as const).map((zone) => (
        <fieldset key={zone} className="overflow-x-auto">
          <legend className="mb-2 text-sm font-semibold text-ink-900">{zone === "IDF" ? "Île-de-France" : "Autres régions"} — plafonds inclus (€)</legend>
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-500">
                <th className="py-1 pr-2 font-medium">Ménage</th>
                {CATS.map((c) => <th key={c} className="py-1 pr-2 font-medium">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {SIZES.map((s, i) => (
                <tr key={s}>
                  <td className="py-1 pr-2 text-ink-600">{s}</td>
                  {[0, 1, 2].map((j) => (
                    <td key={j} className="py-1 pr-2">
                      <input name={`${zone}-${i}-${j}`} inputMode="numeric" defaultValue={ic[zone].bySize[i]?.[j]} aria-label={`${zone} ${s} ${CATS[j]}`} className="field-input py-1.5 text-sm tabular-nums" />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="py-1 pr-2 text-ink-600">+ par pers.</td>
                {[0, 1, 2].map((j) => (
                  <td key={j} className="py-1 pr-2">
                    <input name={`${zone}-x-${j}`} inputMode="numeric" defaultValue={ic[zone].extraPerson[j]} aria-label={`${zone} personne supplémentaire ${CATS[j]}`} className="field-input py-1.5 text-sm tabular-nums" />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </fieldset>
      ))}
      <Feedback state={state} />
      <SubmitButton>Enregistrer les plafonds</SubmitButton>
    </form>
  );
}

const NAMES = { MPR_GESTE: "MaPrimeRénov' par geste", MPR_AMPLEUR: "MaPrimeRénov' rénovation d'ampleur", CEE: "Primes CEE", ECO_PTZ: "Éco-PTZ" } as const;

export function DispositifsForm({ id, data }: { id: string; data: RuleSetData }) {
  const [state, action] = useActionState<DraftState, FormData>(saveDispositifsAction, {});
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Libellé du barème<input name="label" defaultValue={data.meta.label} className="field-input mt-1 py-2 text-sm" required /></label>
        <label className="text-sm">Résumé des changements (obligatoire pour publier)<textarea name="changelog" defaultValue={data.meta.changelog} rows={2} className="field-input mt-1 py-2 text-sm" /></label>
      </div>
      {(Object.keys(NAMES) as (keyof typeof NAMES)[]).map((key) => {
        const d = data.dispositifs[key];
        return (
          <fieldset key={key} className="rounded-xl border border-ink-900/10 p-4">
            <legend className="px-1 text-sm font-semibold text-ink-900">{NAMES[key]}</legend>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={`${key}-enabled`} defaultChecked={d.enabled} className="size-4 accent-pine-600" /> Évalué par le simulateur</label>
              <label className="text-sm">Ouverture
                <select name={`${key}-availability`} defaultValue={d.availability} className="field-input mt-1 py-2 text-sm">
                  <option value="OPEN">Ouvert</option>
                  <option value="SUSPENDED">Suspendu</option>
                  <option value="UNKNOWN">Non confirmé</option>
                </select>
              </label>
              <label className="text-sm">Vérification
                <select name={`${key}-verification`} defaultValue={d.verification.status} className="field-input mt-1 py-2 text-sm">
                  <option value="VERIFIED">Vérifiée</option>
                  <option value="PARTIAL">Partielle</option>
                  <option value="UNVERIFIED">Non vérifiée (conclusion désactivée)</option>
                </select>
              </label>
              <label className="text-sm">Vérifiée le<input type="date" name={`${key}-verifiedAt`} defaultValue={d.verification.verifiedAt} className="field-input mt-1 py-2 text-sm" /></label>
              <label className="text-sm">Règles valables du<input type="date" name={`${key}-validFrom`} defaultValue={d.validFrom} className="field-input mt-1 py-2 text-sm" /></label>
              <label className="text-sm">au<input type="date" name={`${key}-validUntil`} defaultValue={d.validUntil ?? ""} className="field-input mt-1 py-2 text-sm" /></label>
              <label className="text-sm md:col-span-3">Message si suspendu / non confirmé<input name={`${key}-availabilityNote`} defaultValue={d.availabilityNote ?? ""} className="field-input mt-1 py-2 text-sm" /></label>
              <label className="text-sm md:col-span-3">Points non confirmés (vérification partielle)<input name={`${key}-verificationNotes`} defaultValue={d.verification.notes ?? ""} className="field-input mt-1 py-2 text-sm" /></label>
            </div>
          </fieldset>
        );
      })}
      <Feedback state={state} />
      <SubmitButton>Enregistrer les dispositifs</SubmitButton>
    </form>
  );
}

export function JsonForm({ id, json }: { id: string; json: string }) {
  const [state, action] = useActionState<DraftState, FormData>(saveDraftJsonAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="json" className="sr-only">Barème au format JSON</label>
      <textarea id="json" name="json" defaultValue={json} rows={24} spellCheck={false} className="field-input font-mono text-xs leading-relaxed" />
      <Feedback state={state} />
      <SubmitButton>Valider et enregistrer le JSON</SubmitButton>
    </form>
  );
}

export function PublishForm({ id }: { id: string }) {
  const [state, action] = useActionState<DraftState, FormData>(publishDraftAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <label className="flex items-start gap-3 text-sm text-ink-800">
        <input type="checkbox" name="sourcesChecked" className="mt-0.5 size-4 accent-pine-600" />
        J&apos;ai vérifié chaque règle modifiée sur les sources officielles citées, aux dates indiquées, et la prévisualisation ci-dessus correspond aux règles applicables.
      </label>
      <label className="block text-sm">Note de publication (sources consultées, date, changements)
        <textarea name="publicationNote" rows={3} className="field-input mt-1 text-sm" required minLength={10} />
      </label>
      <Feedback state={state} />
      <SubmitButton confirm="Publier cette version ? Elle remplacera immédiatement la version en vigueur pour les nouvelles simulations.">Publier cette version</SubmitButton>
    </form>
  );
}
