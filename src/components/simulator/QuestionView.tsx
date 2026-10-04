"use client";

import {
  BadgeCheck,
  Building,
  Building2,
  CalendarRange,
  Check,
  CircleHelp,
  Fan,
  Flame,
  Fuel,
  Home,
  Key,
  KeyRound,
  Layers,
  Minus,
  Mountain,
  Network,
  Plus,
  Search,
  ShieldX,
  Sparkles,
  TreePalm,
  TreePine,
  Users,
  Wind,
  X,
  Zap,
  Droplets,
  Circle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useId, useState } from "react";
import {
  CONTRACTOR_OPTIONS,
  CURRENT_HEATING_OPTIONS,
  constructionPeriods,
  DPE_OPTIONS,
  HEAT_PUMP_OPTIONS,
  HEATING_TARGET_OPTIONS,
  HOT_WATER_OPTIONS,
  HOUSING_OPTIONS,
  incomeOptions,
  INSULATION_OPTIONS,
  OCCUPANCY_OPTIONS,
  type Option,
  PRIOR_AID_OPTIONS,
  type QuestionContext,
  type QuestionId,
  quoteRecencyOptions,
  residenceOptions,
  VENTILATION_OPTIONS,
  WORK_CATEGORY_OPTIONS,
  YES_NO_UNKNOWN_OPTIONS,
} from "@/engine/questionnaire";
import { MAX_HOUSEHOLD_SIZE } from "@/engine/income";
import type { Answers, ConstructionAnswer, WorkItem } from "@/engine/types";
import { cn } from "@/lib/cn";
import { type ChoiceOption, MultiChoice, SingleChoice } from "./ChoiceCards";
import { LocationField } from "./LocationField";

const withIcons = <T extends string>(options: Option<T>[], icons: Partial<Record<T, LucideIcon>>): ChoiceOption<T>[] =>
  options.map((o) => ({ ...o, icon: icons[o.value] }));

const YNU_ICONS = { OUI: Check, NON: X, INCONNU: CircleHelp } as const;

export interface QuestionViewProps {
  id: QuestionId;
  answers: Answers;
  ctx: QuestionContext;
  /** Met à jour les réponses ; `advance` = passer à la question suivante. */
  update: (patch: Partial<Answers>, advance?: boolean) => void;
}

/** Les questions à choix unique avancent automatiquement ; les autres affichent « Continuer ». */
export function questionNeedsContinue(id: QuestionId): boolean {
  return ["location", "works", "insulationItems", "priorAids", "construction", "householdSize"].includes(id);
}

export function QuestionView({ id, answers, ctx, update }: QuestionViewProps) {
  switch (id) {
    case "location":
      return (
        <LocationField
          autoFocus
          value={{ postalCode: answers.postalCode, communeInsee: answers.communeInsee, communeName: answers.communeName }}
          onChange={(v) => update({ postalCode: v.postalCode, communeInsee: v.communeInsee, communeName: v.communeName, departement: undefined })}
        />
      );
    case "housingType":
      return (
        <SingleChoice
          label="Type de logement"
          options={withIcons(HOUSING_OPTIONS, { MAISON: Home, APPARTEMENT: Building2 })}
          value={answers.housingType}
          onSelect={(v) => update({ housingType: v }, true)}
        />
      );
    case "occupancy":
      return (
        <SingleChoice
          label="Situation"
          options={withIcons(OCCUPANCY_OPTIONS, { PROPRIETAIRE_OCCUPANT: KeyRound, PROPRIETAIRE_BAILLEUR: Building, LOCATAIRE: Key, AUTRE: Users })}
          value={answers.occupancy}
          onSelect={(v) => update({ occupancy: v }, true)}
        />
      );
    case "residence":
      return (
        <SingleChoice
          label="Usage du logement"
          options={withIcons(residenceOptions(answers.occupancy), { PRINCIPALE: Home, SECONDAIRE: TreePalm, AUTRE: CalendarRange })}
          value={answers.residence}
          onSelect={(v) => update({ residence: v }, true)}
        />
      );
    case "construction":
      return <ConstructionInput value={answers.construction} referenceDate={ctx.referenceDate} onChange={(c) => update({ construction: c })} />;
    case "works":
      return (
        <MultiChoice
          label="Travaux envisagés"
          options={withIcons(WORK_CATEGORY_OPTIONS, {
            ISOLATION: Layers,
            CHAUFFAGE: Flame,
            PAC: Fan,
            EAU_CHAUDE: Droplets,
            VENTILATION: Wind,
            RENOVATION_GLOBALE: Sparkles,
            AUTRE: CircleHelp,
          })}
          values={answers.works ?? []}
          onChange={(works) => update({ works })}
        />
      );
    case "insulationItems":
      return (
        <MultiChoice<WorkItem>
          label="Type d'isolation"
          options={INSULATION_OPTIONS}
          values={answers.insulationItems ?? []}
          exclusive={["ISOLATION_INCONNU"]}
          onChange={(insulationItems) => update({ insulationItems })}
        />
      );
    case "heatPumpType":
      return <SingleChoice<WorkItem> label="Type de pompe à chaleur" options={HEAT_PUMP_OPTIONS} value={answers.heatPumpType} onSelect={(v) => update({ heatPumpType: v }, true)} />;
    case "heatingTarget":
      return <SingleChoice<WorkItem> label="Équipement de chauffage" options={HEATING_TARGET_OPTIONS} value={answers.heatingTarget} onSelect={(v) => update({ heatingTarget: v }, true)} />;
    case "hotWaterTarget":
      return <SingleChoice<WorkItem> label="Équipement d'eau chaude" options={HOT_WATER_OPTIONS} value={answers.hotWaterTarget} onSelect={(v) => update({ hotWaterTarget: v }, true)} />;
    case "ventilationTarget":
      return <SingleChoice<WorkItem> label="Ventilation" options={VENTILATION_OPTIONS} value={answers.ventilationTarget} onSelect={(v) => update({ ventilationTarget: v }, true)} />;
    case "currentHeating":
      return (
        <SingleChoice
          label="Chauffage actuel"
          columns={3}
          compact
          options={withIcons(CURRENT_HEATING_OPTIONS, {
            CHAUDIERE_GAZ: Flame,
            CHAUDIERE_FIOUL: Fuel,
            CHAUDIERE_CHARBON: Mountain,
            ELECTRIQUE: Zap,
            BOIS: TreePine,
            PAC: Fan,
            RESEAU_CHALEUR: Network,
            AUTRE: Circle,
            INCONNU: CircleHelp,
          })}
          value={answers.currentHeating}
          onSelect={(v) => update({ currentHeating: v }, true)}
        />
      );
    case "gasBoilerCondensing":
      return (
        <SingleChoice
          label="Chaudière à condensation"
          columns={3}
          options={withIcons(YES_NO_UNKNOWN_OPTIONS, YNU_ICONS)}
          value={answers.gasBoilerCondensing}
          onSelect={(v) => update({ gasBoilerCondensing: v }, true)}
        />
      );
    case "oilTankRemoval":
      return (
        <SingleChoice
          label="Dépose de la cuve à fioul"
          columns={3}
          options={withIcons(YES_NO_UNKNOWN_OPTIONS, YNU_ICONS)}
          value={answers.oilTankRemoval}
          onSelect={(v) => update({ oilTankRemoval: v }, true)}
        />
      );
    case "dpe":
      return <DpeInput value={answers.dpe} onSelect={(v) => update({ dpe: v }, true)} />;
    case "quoteSigned":
      return (
        <SingleChoice
          label="Devis signé"
          columns={3}
          options={withIcons(YES_NO_UNKNOWN_OPTIONS, YNU_ICONS)}
          value={answers.quoteSigned}
          onSelect={(v) => update({ quoteSigned: v }, true)}
        />
      );
    case "quoteSignedRecency": {
      const grace = Math.min(
        ...[ctx.rules.dispositifs.CEE, ctx.rules.dispositifs.MPR_GESTE, ctx.rules.dispositifs.MPR_AMPLEUR, ctx.rules.dispositifs.ECO_PTZ]
          .map((d) => d.quoteSignedGraceDays)
          .filter((x): x is number => x !== null),
      );
      return (
        <SingleChoice
          label="Date de signature"
          columns={3}
          options={quoteRecencyOptions(grace)}
          value={answers.quoteSignedRecency}
          onSelect={(v) => update({ quoteSignedRecency: v }, true)}
        />
      );
    }
    case "worksStarted":
      return (
        <SingleChoice
          label="Travaux commencés"
          columns={3}
          options={withIcons(YES_NO_UNKNOWN_OPTIONS, YNU_ICONS)}
          value={answers.worksStarted}
          onSelect={(v) => update({ worksStarted: v }, true)}
        />
      );
    case "priorAidStatus":
      return (
        <SingleChoice
          label="Aide déjà demandée"
          columns={3}
          options={withIcons(YES_NO_UNKNOWN_OPTIONS, YNU_ICONS)}
          value={answers.priorAidStatus}
          onSelect={(v) => update({ priorAidStatus: v }, true)}
        />
      );
    case "priorAids":
      return <MultiChoice label="Aides déjà demandées" options={PRIOR_AID_OPTIONS} values={answers.priorAids ?? []} onChange={(priorAids) => update({ priorAids })} />;
    case "contractor":
      return (
        <SingleChoice
          label="Entreprise"
          options={withIcons(CONTRACTOR_OPTIONS, { NON_CHOISIE: Search, RGE: BadgeCheck, RGE_INCONNU: CircleHelp, NON_RGE: ShieldX })}
          value={answers.contractor}
          onSelect={(v) => update({ contractor: v }, true)}
        />
      );
    case "householdSize":
      return <HouseholdInput value={answers.householdSize} onChange={(n) => update({ householdSize: n, income: undefined })} />;
    case "income": {
      const options = incomeOptions(answers, ctx) ?? [];
      return <SingleChoice label="Revenu fiscal de référence" columns={1} options={options} value={answers.income} onSelect={(v) => update({ income: v }, true)} />;
    }
  }
}

// ─── Saisies spécifiques ────────────────────────────────────────────────────

function ConstructionInput({
  value,
  referenceDate,
  onChange,
}: {
  value: ConstructionAnswer | undefined;
  referenceDate: string;
  onChange: (c: ConstructionAnswer) => void;
}) {
  const id = useId();
  const refYear = Number(referenceDate.slice(0, 4));
  const periods = constructionPeriods(referenceDate);
  const [year, setYear] = useState(value?.kind === "YEAR" ? String(value.year) : "");
  const yearNum = Number(year);
  const yearError = year.length === 4 && (yearNum < 1000 || yearNum > refYear) ? `Indiquez une année entre 1000 et ${refYear}.` : null;
  const selectedPeriod = value?.kind === "PERIOD" ? periods.find((p) => p.from === value.from && p.to === value.to)?.id : undefined;

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor={`${id}-year`} className="field-label">
          Année d&apos;achèvement, si vous la connaissez
        </label>
        <input
          id={`${id}-year`}
          inputMode="numeric"
          maxLength={4}
          value={year}
          placeholder="ex. 1985"
          aria-invalid={Boolean(yearError)}
          className="field-input max-w-[12rem] text-lg"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
            setYear(v);
            const n = Number(v);
            if (v.length === 4 && n >= 1000 && n <= refYear) onChange({ kind: "YEAR", year: n });
          }}
        />
        {yearError && <p className="field-error">{yearError}</p>}
      </div>
      <div>
        <p className="field-label">Sinon, choisissez une période</p>
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={selectedPeriod === p.id}
              onClick={() => {
                setYear("");
                onChange({ kind: "PERIOD", from: p.from, to: p.to });
              }}
              className={cn(
                "rounded-full border-2 px-4 py-2.5 text-sm font-medium transition",
                selectedPeriod === p.id ? "border-pine-500 bg-pine-50 text-pine-900" : "border-ink-900/10 bg-white text-ink-700 hover:border-pine-300",
              )}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={value?.kind === "UNKNOWN"}
            onClick={() => {
              setYear("");
              onChange({ kind: "UNKNOWN" });
            }}
            className={cn(
              "rounded-full border-2 px-4 py-2.5 text-sm font-medium transition",
              value?.kind === "UNKNOWN" ? "border-pine-500 bg-pine-50 text-pine-900" : "border-ink-900/10 bg-white text-ink-700 hover:border-pine-300",
            )}
          >
            Je ne sais pas
          </button>
        </div>
      </div>
    </div>
  );
}

function HouseholdInput({ value, onChange }: { value: number | undefined; onChange: (n: number) => void }) {
  const n = value ?? 1;
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, n - 1))}
        disabled={n <= 1}
        aria-label="Une personne de moins"
        className="grid size-14 place-items-center rounded-2xl border-2 border-ink-900/10 bg-white text-ink-800 transition hover:border-pine-300 disabled:opacity-40"
      >
        <Minus className="size-5" aria-hidden />
      </button>
      <output aria-live="polite" className="min-w-24 text-center">
        <span className="block font-display text-5xl font-bold text-ink-900">{n}</span>
        <span className="text-sm text-ink-500">{n > 1 ? "personnes" : "personne"}</span>
      </output>
      <button
        type="button"
        onClick={() => onChange(Math.min(MAX_HOUSEHOLD_SIZE, n + 1))}
        disabled={n >= MAX_HOUSEHOLD_SIZE}
        aria-label="Une personne de plus"
        className="grid size-14 place-items-center rounded-2xl border-2 border-ink-900/10 bg-white text-ink-800 transition hover:border-pine-300 disabled:opacity-40"
      >
        <Plus className="size-5" aria-hidden />
      </button>
    </div>
  );
}

const DPE_COLORS: Record<string, string> = {
  A: "bg-[#009c6d]",
  B: "bg-[#52b153]",
  C: "bg-[#a5cc74]",
  D: "bg-[#f4e70f] text-ink-900",
  E: "bg-[#f0b40f] text-ink-900",
  F: "bg-[#eb8235]",
  G: "bg-[#d7221f]",
};

function DpeInput({ value, onSelect }: { value: Answers["dpe"]; onSelect: (v: NonNullable<Answers["dpe"]>) => void }) {
  return (
    <div className="space-y-3" role="group" aria-label="Classe énergétique">
      {DPE_OPTIONS.filter((o) => o.value !== "INCONNU").map((o, i) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onSelect(o.value)}
          style={{ width: `${46 + i * 8}%` }}
          className={cn(
            "flex min-w-[9rem] items-center justify-between rounded-r-full rounded-l-xl px-4 py-2 font-display text-lg font-bold text-white shadow-sm transition hover:translate-x-1",
            DPE_COLORS[o.value],
            value === o.value && "ring-4 ring-ink-900/80 ring-offset-2",
          )}
        >
          {o.label}
          {value === o.value && <Check className="size-5" aria-hidden />}
        </button>
      ))}
      <button
        type="button"
        aria-pressed={value === "INCONNU"}
        onClick={() => onSelect("INCONNU")}
        className={cn(
          "mt-2 rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition",
          value === "INCONNU" ? "border-pine-500 bg-pine-50 text-pine-900" : "border-ink-900/10 bg-white text-ink-700 hover:border-pine-300",
        )}
      >
        Je ne sais pas
      </button>
    </div>
  );
}
