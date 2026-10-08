"use client";

import {
  ArrowDownToLine,
  BadgeCheck,
  Building,
  Building2,
  CalendarRange,
  Car,
  Check,
  CircleHelp,
  CookingPot,
  Fan,
  Flame,
  Fuel,
  Heater,
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
  Trees,
  Users,
  WashingMachine,
  Waves,
  Wind,
  X,
  Zap,
  Droplets,
  Circle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useId, useState } from "react";
import {
  BOILER_LOCATION_OPTIONS,
  CONTRACTOR_OPTIONS,
  CURRENT_HEATING_OPTIONS,
  constructionPeriods,
  DPE_OPTIONS,
  HEAT_EMITTER_OPTIONS,
  HEAT_PUMP_OPTIONS,
  HEATING_TARGET_OPTIONS,
  HOT_WATER_OPTIONS,
  HOUSING_OPTIONS,
  HYDRAULIC_EMITTERS,
  incomeOptions,
  INSULATION_OPTIONS,
  NUMBER_QUESTIONS,
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
import type { Answers, ConstructionAnswer, CountAnswer, HeatEmitter, IncomeAnswer, IncomeCategory, WorkItem } from "@/engine/types";
import { cn } from "@/lib/cn";
import { AvisImpotHelp } from "./AvisImpotHelp";
import { type ChoiceOption, MultiChoice, SingleChoice } from "./ChoiceCards";
import { LocationField } from "./LocationField";

const withIcons = <T extends string>(options: Option<T>[], icons: Partial<Record<T, LucideIcon>>): ChoiceOption<T>[] =>
  options.map((o) => ({ ...o, icon: icons[o.value] }));

const YNU_ICONS = { OUI: Check, NON: X, INCONNU: CircleHelp } as const;

/** Pastilles des profils de revenus (bleu, jaune, violet, rose), lisibles sur fond clair comme sombre. */
export const INCOME_DOT_CLASS: Record<IncomeCategory, string> = {
  TRES_MODESTE: "bg-blue-400",
  MODESTE: "bg-yellow-300",
  INTERMEDIAIRE: "bg-violet-400",
  SUPERIEUR: "bg-pink-400",
};

const isIncomeCategory = (v: IncomeAnswer): v is IncomeCategory => v !== "INCONNU";

export interface QuestionViewProps {
  id: QuestionId;
  answers: Answers;
  ctx: QuestionContext;
  /** Met à jour les réponses ; `advance` = passer à la question suivante. */
  update: (patch: Partial<Answers>, advance?: boolean) => void;
}

/** Les questions à choix unique avancent automatiquement ; les autres affichent « Continuer ». */
export function questionNeedsContinue(id: QuestionId): boolean {
  return ["location", "works", "insulationItems", "priorAids", "construction", "householdSize", "radiatorCount", "heatedArea"].includes(id);
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
    case "heatEmitters": {
      // Les émetteurs à eau (compatibles avec une PAC air/eau ou une chaudière) sont regroupés en tête.
      const options = withIcons(HEAT_EMITTER_OPTIONS, {
        RADIATEURS_FONTE: Heater,
        RADIATEURS_ACIER_ALU: Heater,
        PLANCHER_CHAUFFANT_EAU: Waves,
        RADIATEURS_ELECTRIQUES: Zap,
        POELE_CHEMINEE: Flame,
        AUTRE: Circle,
      });
      const select = (v: HeatEmitter) => update({ heatEmitters: v }, true);
      // « Je ne sais pas » n'est pas un mode de chauffage : choix à part, sous les deux groupes.
      return (
        <div className="space-y-5">
          <div>
            <p aria-hidden className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Chauffage central à eau</p>
            <SingleChoice
              label="Chauffage central à eau"
              columns={1}
              compact
              options={options.filter((o) => HYDRAULIC_EMITTERS.includes(o.value))}
              value={answers.heatEmitters}
              onSelect={select}
            />
          </div>
          <div>
            <p aria-hidden className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Autres modes de chauffage</p>
            <SingleChoice
              label="Autres modes de chauffage"
              compact
              options={options.filter((o) => !HYDRAULIC_EMITTERS.includes(o.value) && o.value !== "INCONNU")}
              value={answers.heatEmitters}
              onSelect={select}
            />
          </div>
          <UnknownChoice selected={answers.heatEmitters === "INCONNU"} onSelect={() => select("INCONNU")} />
        </div>
      );
    }
    case "radiatorCount":
      return (
        <NumberInput
          key={id}
          label="Nombre de radiateurs à eau"
          bounds={NUMBER_QUESTIONS.radiatorCount!}
          value={answers.radiatorCount}
          onChange={(v, advance) => update({ radiatorCount: v }, advance)}
        />
      );
    case "heatedArea":
      return (
        <NumberInput
          key={id}
          label="Surface chauffée, en m²"
          bounds={NUMBER_QUESTIONS.heatedArea!}
          value={answers.heatedArea}
          onChange={(v, advance) => update({ heatedArea: v }, advance)}
        />
      );
    case "boilerLocation":
      return (
        <SingleChoice
          label="Emplacement de la chaudière"
          compact
          options={withIcons(BOILER_LOCATION_OPTIONS, {
            CUISINE: CookingPot,
            GARAGE: Car,
            CAVE_SOUS_SOL: ArrowDownToLine,
            BUANDERIE_CELLIER: WashingMachine,
            EXTERIEUR: Trees,
            AUTRE: Circle,
            INCONNU: CircleHelp,
          })}
          value={answers.boilerLocation}
          onSelect={(v) => update({ boilerLocation: v }, true)}
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
      return (
        <div className="space-y-6">
          <HouseholdInput value={answers.householdSize} onChange={(n) => update({ householdSize: n, income: undefined })} />
          <AvisImpotHelp question="householdSize" />
        </div>
      );
    case "income": {
      // Chaque tranche rappelle le profil de revenus (bleu, jaune, violet, rose) avec sa pastille.
      const options = (incomeOptions(answers, ctx) ?? []).map((o) => ({ ...o, hintDot: isIncomeCategory(o.value) ? INCOME_DOT_CLASS[o.value] : undefined }));
      return (
        // L'aide de lecture de l'avis d'impôt précède les tranches, qui avancent dès qu'on en choisit une.
        <div className="space-y-5">
          <AvisImpotHelp question="income" />
          <SingleChoice label="Revenu fiscal de référence" columns={1} options={options} value={answers.income} onSelect={(v) => update({ income: v }, true)} />
        </div>
      );
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
                selectedPeriod === p.id ? "border-pine-500 bg-pine-50 text-pine-900" : "border-ink-900/10 bg-surface text-ink-700 hover:border-pine-300",
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
              value?.kind === "UNKNOWN" ? "border-pine-500 bg-pine-50 text-pine-900" : "border-ink-900/10 bg-surface text-ink-700 hover:border-pine-300",
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
        className="grid size-14 place-items-center rounded-2xl border-2 border-ink-900/10 bg-surface text-ink-800 transition hover:border-pine-300 disabled:opacity-40"
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
        className="grid size-14 place-items-center rounded-2xl border-2 border-ink-900/10 bg-surface text-ink-800 transition hover:border-pine-300 disabled:opacity-40"
      >
        <Plus className="size-5" aria-hidden />
      </button>
    </div>
  );
}

/**
 * Saisie d'un nombre entier borné (nombre de radiateurs, surface), avec « Je ne sais pas ».
 * Seule une valeur valide est enregistrée : « Continuer » reste inactif tant que la saisie est hors bornes.
 * Entrée valide la saisie ; « Je ne sais pas » passe directement à la question suivante.
 */
function NumberInput({
  label,
  bounds,
  value,
  onChange,
}: {
  label: string;
  bounds: { min: number; max: number; unit: string; placeholder: string };
  value: CountAnswer | undefined;
  onChange: (v: CountAnswer | undefined, advance?: boolean) => void;
}) {
  const id = useId();
  const { min, max, unit, placeholder } = bounds;
  const [text, setText] = useState(typeof value === "number" ? String(value) : "");
  const [touched, setTouched] = useState(false);
  const n = text === "" ? null : Number(text);
  const inRange = n !== null && Number.isInteger(n) && n >= min && n <= max;
  const fmt = (x: number) => x.toLocaleString("fr-FR");
  // Message affiché dès qu'il ne peut plus être corrigé en ajoutant des chiffres, sinon en quittant le champ.
  const showError = n !== null && !inRange && (touched || n > max || text.length >= String(min).length);
  const error = showError ? `Indiquez un nombre entre ${fmt(min)} et ${fmt(max)}.` : null;
  const unitLabel = n === 1 && unit.endsWith("s") ? unit.slice(0, -1) : unit;

  return (
    <div className="space-y-5">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (inRange) onChange(n, true);
        }}
      >
        <label htmlFor={`${id}-n`} className="field-label">
          {label}
        </label>
        <div className="relative max-w-[17rem]">
          <input
            id={`${id}-n`}
            inputMode="numeric"
            enterKeyHint="next"
            autoComplete="off"
            maxLength={String(max).length}
            value={text}
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-h`}
            className={cn("field-input h-16 font-display text-2xl font-semibold tabular-nums", unit.length > 3 ? "pr-28" : "pr-14")}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, String(max).length);
              setText(v);
              const x = v === "" ? null : Number(v);
              onChange(x !== null && x >= min && x <= max ? x : undefined);
            }}
            onBlur={() => text && setTouched(true)}
          />
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-base font-medium text-ink-500">
            {unitLabel}
          </span>
        </div>
        <p id={`${id}-h`} className={error ? "field-error" : "field-help"} aria-live="polite">
          {error ?? `Entre ${fmt(min)} et ${fmt(max)} ${unit}.`}
        </p>
      </form>
      <div className="flex items-center gap-3">
        <span className="text-sm text-ink-500">ou</span>
        <UnknownChoice
          selected={value === "INCONNU"}
          onSelect={() => {
            setText("");
            setTouched(false);
            onChange("INCONNU", true);
          }}
        />
      </div>
    </div>
  );
}

/** Choix « Je ne sais pas » présenté à part des autres réponses. */
function UnknownChoice({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "inline-flex min-h-12 items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition",
        selected ? "border-pine-500 bg-pine-50 text-pine-900" : "border-ink-900/10 bg-surface text-ink-700 hover:border-pine-300",
      )}
    >
      <CircleHelp className="size-4" aria-hidden />
      Je ne sais pas
    </button>
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
          value === "INCONNU" ? "border-pine-500 bg-pine-50 text-pine-900" : "border-ink-900/10 bg-surface text-ink-700 hover:border-pine-300",
        )}
      >
        Je ne sais pas
      </button>
    </div>
  );
}
