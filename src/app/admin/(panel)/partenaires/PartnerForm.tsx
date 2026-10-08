"use client";

import { useActionState, useId } from "react";
import { IncomeBadge } from "@/components/admin/IncomeBadge";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { CURRENT_HEATING_OPTIONS, HEAT_EMITTER_OPTIONS, HYDRAULIC_EMITTERS, OCCUPANCY_OPTIONS } from "@/engine/questionnaire";
import type { WorkCategory, WorkItem } from "@/engine/types";
import { WORK_CATEGORY_LABELS, WORK_ITEMS } from "@/engine/works";
import { INCOME_CATEGORIES } from "@/lib/leads/profile";
import { type PartnerState, savePartnerAction } from "./actions";
import { AGE_RANGE, AREA_RANGE, DETAILS_MAX, type MultiField, NAME_MAX, type PartnerFormValues } from "./form";

interface Choice {
  value: string;
  label: React.ReactNode;
  hint?: string;
}

const WORKS_BY_CATEGORY = (Object.keys(WORK_CATEGORY_LABELS) as WorkCategory[]).map((category) => ({
  category,
  items: (Object.entries(WORK_ITEMS) as [WorkItem, (typeof WORK_ITEMS)[WorkItem]][])
    .filter(([, info]) => info.category === category)
    .map(([value, info]): Choice => ({ value, label: info.label })),
}));

const INCOME_CHOICES: Choice[] = INCOME_CATEGORIES.map((c) => ({ value: c, label: <IncomeBadge category={c} long /> }));
const HOUSING_CHOICES: Choice[] = [
  { value: "MAISON", label: "Maison" },
  { value: "APPARTEMENT", label: "Appartement" },
];
const OCCUPANCY_CHOICES: Choice[] = OCCUPANCY_OPTIONS.map((o) => ({ value: o.value, label: o.label, hint: o.hint }));
const HEATING_CHOICES: Choice[] = CURRENT_HEATING_OPTIONS.filter((o) => o.value !== "INCONNU").map((o) => ({ value: o.value, label: o.label, hint: o.hint }));
const EMITTER_CHOICES: Choice[] = HEAT_EMITTER_OPTIONS.filter((o) => o.value !== "INCONNU").map((o) => ({
  value: o.value,
  label: o.label,
  hint: HYDRAULIC_EMITTERS.includes(o.value) ? "Chauffage central à eau" : o.hint,
}));

function Checks({ name, choices, selected, className }: { name: MultiField; choices: Choice[]; selected: string[]; className?: string }) {
  return (
    <div className={className ?? "space-y-2"}>
      {choices.map((c) => (
        <label key={c.value} className="flex items-start gap-2.5 text-sm text-ink-800">
          <input type="checkbox" name={name} value={c.value} defaultChecked={selected.includes(c.value)} className="mt-0.5 size-4 shrink-0 accent-pine-600" />
          <span>
            {c.label}
            {c.hint && <span className="block text-xs text-ink-500">{c.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

function Group({ legend, help, children, className }: { legend: string; help?: string; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={className ?? "rounded-xl border border-ink-900/10 p-4"}>
      <legend className="px-1 text-sm font-semibold text-ink-900">{legend}</legend>
      {help && <p className="mb-3 text-xs text-ink-500">{help}</p>}
      {children}
    </fieldset>
  );
}

/**
 * Fiche d'une entreprise partenaire : identité publique et critères des demandes recherchées.
 * `nameLocked` : des demandes la nomment déjà ou des rendez-vous lui ont été confiés, sa dénomination
 * ne peut plus changer (contrôlé aussi par le serveur).
 */
export function PartnerForm({
  partnerId,
  initial,
  submitLabel,
  nameLocked = false,
}: {
  partnerId?: string;
  initial: PartnerFormValues;
  submitLabel: string;
  nameLocked?: boolean;
}) {
  const [state, action] = useActionState<PartnerState, FormData>(savePartnerAction, {});
  const uid = useId();
  // Après une erreur, la saisie renvoyée par le serveur devient la valeur par défaut des champs.
  const v = state.values ?? initial;
  return (
    <form action={action} className="space-y-6">
      {partnerId && <input type="hidden" name="id" value={partnerId} />}

      <section aria-labelledby={`${uid}-company`} className="space-y-4">
        <h2 id={`${uid}-company`} className="font-sans text-base font-semibold text-ink-900">Entreprise</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-ink-800">
            Dénomination *
            <input
              name="name"
              required
              maxLength={NAME_MAX}
              defaultValue={v.name}
              readOnly={nameLocked}
              aria-describedby={`${uid}-name-hint`}
              autoComplete="off"
              className={nameLocked ? "field-input mt-1 bg-sand-100 py-2.5 text-sm text-ink-700" : "field-input mt-1 py-2.5 text-sm"}
            />
            <span id={`${uid}-name-hint`} className="mt-1 block text-xs text-ink-500">
              {nameLocked
                ? "Des demandes nomment déjà cette entreprise ou lui ont été confiées : sa dénomination ne peut plus changer. Pour une autre entreprise, créez une nouvelle fiche."
                : "Telle qu'elle est annoncée à la personne, dans sa demande ou avant son accord pour un rendez-vous."}
            </span>
          </label>
          <label className="block text-sm text-ink-800">
            Précisions
            <input name="details" maxLength={DETAILS_MAX} defaultValue={v.details} placeholder="Ville, qualification RGE…" autoComplete="off" className="field-input mt-1 py-2.5 text-sm" />
            <span className="mt-1 block text-xs text-ink-500">Facultatif, affiché après la dénomination.</span>
          </label>
        </div>
        <label className="flex items-start gap-2.5 text-sm text-ink-800">
          <input type="checkbox" name="active" defaultChecked={v.active} className="mt-0.5 size-4 accent-pine-600" />
          <span>
            Entreprise active
            <span className="block text-xs text-ink-500">
              Une entreprise active peut se voir confier des rendez-vous et peut être nommée dans la demande des visiteurs dont les réponses
              correspondent à ses critères ; elle est citée dans la politique de confidentialité et les mentions légales.
            </span>
          </span>
        </label>
        {partnerId && (
          <p className="text-xs text-ink-500">
            Les demandes et les rendez-vous déjà confiés gardent le nom lu par la personne ; ils restent rattachés à cette fiche après un changement
            de précisions. Une demande qui nomme l&apos;entreprise sous un autre nom est signalée dans l&apos;export (« Nom à la demande ≠ nom
            actuel »).
          </p>
        )}
      </section>

      <section aria-labelledby={`${uid}-criteria`} className="space-y-4 border-t border-ink-900/[0.06] pt-6">
        <div>
          <h2 id={`${uid}-criteria`} className="font-sans text-base font-semibold text-ink-900">Demandes recherchées</h2>
          <p className="mt-1 text-sm text-ink-600">
            Ces critères choisissent l&apos;entreprise nommée dans la demande du visiteur avant l&apos;envoi (une correspondance complète d&apos;abord,
            sinon une à vérifier, puis l&apos;ordre alphabétique) et servent à trier les demandes. Une modification s&apos;applique immédiatement aux
            visiteurs en cours. Un groupe sans case cochée ne filtre pas : sans aucun critère, l&apos;entreprise peut être nommée dans toutes les
            demandes. Une réponse « je ne sais pas » n&apos;écarte jamais une demande : elle reste « à vérifier » avec la personne.
          </p>
        </div>

        <Group legend="Travaux souhaités" help="Une demande « à préciser » de la même famille est aussi retenue, à vérifier.">
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            {WORKS_BY_CATEGORY.map(({ category, items }) => (
              <fieldset key={category}>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">{WORK_CATEGORY_LABELS[category]}</legend>
                <Checks name="works" choices={items} selected={v.works} />
              </fieldset>
            ))}
          </div>
        </Group>

        <div className="grid gap-4 lg:grid-cols-3">
          <Group legend="Revenus du foyer" help="Catégories France Rénov' déclarées par la personne, sans justificatif.">
            <Checks name="incomeCategories" choices={INCOME_CHOICES} selected={v.incomeCategories} />
          </Group>
          <Group legend="Type de logement">
            <Checks name="housingTypes" choices={HOUSING_CHOICES} selected={v.housingTypes} />
          </Group>
          <Group legend="Statut" help="Propriétaire ou locataire.">
            <Checks name="occupancies" choices={OCCUPANCY_CHOICES} selected={v.occupancies} />
          </Group>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Group legend="Chauffage actuel">
            <Checks name="currentHeating" choices={HEATING_CHOICES} selected={v.currentHeating} className="grid gap-2 sm:grid-cols-2" />
          </Group>
          <Group legend="Diffusion de la chaleur" help="Émetteurs du logement : radiateurs à eau, plancher chauffant, radiateurs électriques…">
            <Checks name="heatEmitters" choices={EMITTER_CHOICES} selected={v.heatEmitters} />
          </Group>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm text-ink-800">
            Surface chauffée minimale (m²)
            <input
              name="minHeatedArea"
              type="number"
              inputMode="numeric"
              min={AREA_RANGE.min}
              max={AREA_RANGE.max}
              step={1}
              defaultValue={v.minHeatedArea}
              placeholder="Aucun minimum"
              className="field-input mt-1 py-2.5 text-sm"
            />
            <span className="mt-1 block text-xs text-ink-500">Facultatif. Surface chauffée déclarée par la personne.</span>
          </label>
          <label className="block text-sm text-ink-800">
            Ancienneté minimale du logement (années)
            <input
              name="minBuildingAge"
              type="number"
              inputMode="numeric"
              min={AGE_RANGE.min}
              max={AGE_RANGE.max}
              step={1}
              defaultValue={v.minBuildingAge}
              placeholder="Aucun minimum"
              className="field-input mt-1 py-2.5 text-sm"
            />
            <span className="mt-1 block text-xs text-ink-500">Facultatif. Ex. : 2 = logement achevé depuis plus de 2 ans.</span>
          </label>
          <label className="block text-sm text-ink-800">
            Départements
            <input name="departements" defaultValue={v.departements} placeholder="Ex. : 59, 62, 2A" autoComplete="off" className="field-input mt-1 py-2.5 text-sm" />
            <span className="mt-1 block text-xs text-ink-500">Facultatif. Numéros séparés par des virgules ou des espaces ; vide = toute la France.</span>
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-ink-900/[0.06] pt-5">
        <SubmitButton className="py-2.5">{submitLabel}</SubmitButton>
        {state.error && <p role="alert" className="text-sm font-medium text-red-700">{state.error}</p>}
        {state.ok && <p role="status" className="text-sm font-medium text-pine-700">{state.ok}</p>}
      </div>
    </form>
  );
}
