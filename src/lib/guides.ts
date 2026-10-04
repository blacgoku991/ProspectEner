import { coverageForCategory, type CategoryCoverage } from "@/engine/coverage";
import { INCOME_CATEGORY_LABELS } from "@/engine/income";
import type { RuleSetData } from "@/engine/ruleset-schema";
import type { DispositifId, SourceRef, WorkCategory, WorkItem } from "@/engine/types";
import { WORK_CATEGORY_LABELS, WORK_ITEMS } from "@/engine/works";

/**
 * Pages d'information (aides et types de travaux), générées uniquement à partir du barème publié :
 * aucune condition, aucun montant ni aucune date n'est écrit en dur. Si le barème change, les pages suivent.
 */

// ─── Aides ──────────────────────────────────────────────────────────────────

export interface AidGuide {
  id: DispositifId;
  slug: string;
}

export const AID_GUIDES: readonly AidGuide[] = [
  { id: "MPR_GESTE", slug: "maprimerenov-par-geste" },
  { id: "MPR_AMPLEUR", slug: "maprimerenov-renovation-ampleur" },
  { id: "CEE", slug: "primes-energie-cee" },
  { id: "ECO_PTZ", slug: "eco-pret-a-taux-zero" },
];

export const aidGuideBySlug = (slug: string) => AID_GUIDES.find((g) => g.slug === slug) ?? null;
export const aidGuidePath = (id: DispositifId) => `/aides/${AID_GUIDES.find((g) => g.id === id)!.slug}`;

/** Aides activées dans le barème publié, dans l'ordre d'affichage. */
export function enabledAidGuides(rules: RuleSetData): AidGuide[] {
  return AID_GUIDES.filter((g) => rules.dispositifs[g.id].enabled);
}

// ─── Types de travaux ───────────────────────────────────────────────────────

export interface WorkGuide {
  slug: string;
  categories: WorkCategory[];
  /** Nom court (menus, cartes). */
  name: string;
  /** Titre principal de la page. */
  h1: string;
  /** Présentation des travaux (factuelle, sans condition d'aide). */
  intro: string;
}

export const WORK_GUIDES: readonly WorkGuide[] = [
  {
    slug: "pompe-a-chaleur",
    categories: ["PAC"],
    name: "Pompe à chaleur",
    h1: "Aides pour installer une pompe à chaleur",
    intro: "Pompe à chaleur air/eau, géothermique, hybride ou air/air : selon le modèle, les aides ne sont pas les mêmes.",
  },
  {
    slug: "isolation",
    categories: ["ISOLATION"],
    name: "Isolation",
    h1: "Aides pour isoler son logement",
    intro: "Combles et toiture, murs, plancher bas, fenêtres : chaque poste d'isolation relève de règles qui lui sont propres.",
  },
  {
    slug: "chauffage",
    categories: ["CHAUFFAGE"],
    name: "Changement de chauffage",
    h1: "Aides pour changer de chauffage",
    intro: "Chaudière bois ou granulés, poêle, raccordement à un réseau de chaleur, système solaire combiné : les équipements de chauffage hors pompe à chaleur.",
  },
  {
    slug: "chauffe-eau",
    categories: ["EAU_CHAUDE"],
    name: "Chauffe-eau",
    h1: "Aides pour un chauffe-eau thermodynamique ou solaire",
    intro: "Le remplacement d'un chauffe-eau par un équipement plus performant peut être aidé, sous conditions.",
  },
  {
    slug: "ventilation",
    categories: ["VENTILATION"],
    name: "Ventilation (VMC)",
    h1: "Aides pour installer une VMC",
    intro: "VMC simple flux ou double flux : la ventilation accompagne souvent des travaux d'isolation.",
  },
  {
    slug: "renovation-globale",
    categories: ["RENOVATION_GLOBALE"],
    name: "Rénovation globale",
    h1: "Aides pour une rénovation globale",
    intro: "Plusieurs travaux réalisés ensemble pour gagner des classes énergétiques : c'est le parcours dit « de rénovation d'ampleur ».",
  },
];

export const workGuideBySlug = (slug: string) => WORK_GUIDES.find((g) => g.slug === slug) ?? null;

/** Page de travaux correspondant à un poste (pour les liens internes). */
export function workGuideForItem(item: WorkItem): WorkGuide | null {
  return WORK_GUIDES.find((g) => g.categories.includes(WORK_ITEMS[item].category)) ?? null;
}

/** Couverture de plusieurs familles de travaux par chaque dispositif activé (une entrée par dispositif). */
export function coverageFor(rules: RuleSetData, categories: readonly WorkCategory[]): CategoryCoverage[] {
  const map = new Map<DispositifId, CategoryCoverage>();
  for (const c of categories.flatMap((cat) => coverageForCategory(rules, cat))) {
    const prev = map.get(c.id);
    if (!prev) map.set(c.id, { ...c, covered: [...c.covered], review: [...c.review], excluded: [...c.excluded] });
    else {
      prev.covered.push(...c.covered);
      prev.review.push(...c.review);
      prev.excluded.push(...c.excluded);
    }
  }
  return [...map.values()];
}

/** Couverture d'un type de travaux par chaque dispositif activé. */
export function workCoverage(rules: RuleSetData, guide: WorkGuide): CategoryCoverage[] {
  return coverageFor(rules, guide.categories);
}

/** Dispositifs qui couvrent (ou peuvent couvrir, à vérifier) au moins un poste de ce type de travaux. */
export function aidsForWork(rules: RuleSetData, guide: WorkGuide): DispositifId[] {
  return workCoverage(rules, guide)
    .filter((c) => c.covered.length + c.review.length > 0)
    .map((c) => c.id);
}

export const PUBLIC_SHORT_NAMES: Record<DispositifId, string> = {
  MPR_GESTE: "MaPrimeRénov'",
  MPR_AMPLEUR: "MaPrimeRénov' ampleur",
  CEE: "Prime CEE",
  ECO_PTZ: "Éco-PTZ",
};

/** Postes précis (hors « à préciser ») d'un type de travaux. */
export function workItemsOf(guide: WorkGuide): WorkItem[] {
  return (Object.keys(WORK_ITEMS) as WorkItem[]).filter((w) => guide.categories.includes(WORK_ITEMS[w].category) && !WORK_ITEMS[w].undetermined);
}

// ─── Textes dérivés du barème ───────────────────────────────────────────────

const OCCUPANCY_PLURAL = {
  PROPRIETAIRE_OCCUPANT: "propriétaires occupants",
  PROPRIETAIRE_BAILLEUR: "propriétaires bailleurs",
  LOCATAIRE: "locataires",
  AUTRE: "autres situations (usufruit, indivision, société…)",
} as const;

const TERRITORY_LABELS = { IDF: "Île-de-France", METRO: "autres régions de métropole", DROM: "outre-mer" } as const;

/** Énumération à la française : « a, b et c » (ou « a, b ou c »). */
export function frenchList(items: readonly string[], conjunction: "et" | "ou" = "et"): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1]}`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const longDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** Familles de travaux couvertes par un dispositif (libellés en minuscules). */
export function coveredCategories(rules: RuleSetData, id: DispositifId): string[] {
  const cats = new Set(rules.dispositifs[id].eligibleWorks.map((w) => WORK_ITEMS[w].category));
  return [...cats].map((c) => WORK_CATEGORY_LABELS[c].toLowerCase());
}

/** Phrase de présentation courte d'une aide (cartes de l'accueil et de la page des aides). */
export function aidSummary(rules: RuleSetData, id: DispositifId): string {
  const d = rules.dispositifs;
  switch (id) {
    case "MPR_GESTE": {
      const owners = d.MPR_GESTE.eligibleOccupancies.every((o) => o.startsWith("PROPRIETAIRE"));
      return `Subvention pour certains travaux (${frenchList(coveredCategories(rules, id))})${owners ? ", réservée aux propriétaires" : ""}, selon les revenus du ménage.`;
    }
    case "MPR_AMPLEUR":
      return `Subvention pour une rénovation globale d'un logement classé ${frenchList(d.MPR_AMPLEUR.eligibleDpe)}, avec un accompagnement obligatoire.`;
    case "CEE":
      return "Prime versée par des fournisseurs d'énergie pour de nombreux travaux (isolation, chauffage, eau chaude…), à demander avant de signer le devis.";
    case "ECO_PTZ":
      return "Prêt sans intérêts et sans condition de ressources, à rembourser : ce n'est pas une subvention.";
  }
}

/** « Qui peut en bénéficier ? » — conditions de statut, de logement, de revenus et de territoire. */
export function eligibilityLines(rules: RuleSetData, id: DispositifId): string[] {
  const d = rules.dispositifs[id];
  const lines: string[] = [];
  if (d.eligibleOccupancies.length > 0) {
    lines.push(`Ouvert aux ${frenchList(d.eligibleOccupancies.map((o) => OCCUPANCY_PLURAL[o]))}.`);
  }
  const review = d.reviewOccupancies.map((o) => OCCUPANCY_PLURAL[o]);
  if (review.length > 0) lines.push(`À vérifier au cas par cas : ${frenchList(review)}.`);

  const housing: string[] = [];
  if (d.minAgeYears > 0) housing.push(`achevé depuis au moins ${d.minAgeYears} ans`);
  if (id === "MPR_AMPLEUR") housing.push(`classé ${frenchList(rules.dispositifs.MPR_AMPLEUR.eligibleDpe)} au diagnostic de performance énergétique (DPE)`);
  if (d.requiresPrincipalResidence) housing.push("occupé comme résidence principale");
  if (id === "CEE" && rules.dispositifs.CEE.secondaryResidence === "ELIGIBLE") housing.push("résidence principale ou secondaire");
  if (housing.length > 0) lines.push(`Logement ${frenchList(housing)}.`);

  if (id === "MPR_GESTE") {
    for (const ex of rules.dispositifs.MPR_GESTE.ageExceptions) {
      lines.push(`Exception : logement de plus de ${ex.minAgeYears} ans en cas de ${ex.label}.`);
    }
  }
  if (id === "MPR_GESTE" || id === "MPR_AMPLEUR") {
    const cats = rules.dispositifs[id].eligibleIncomeCategories;
    lines.push(
      cats.length === 4
        ? "Toutes catégories de revenus, avec des conditions qui dépendent des revenus du ménage."
        : `Ménages aux ${frenchList(cats.map((c) => INCOME_CATEGORY_LABELS[c].replace(/^Revenus /, "revenus ")))}, selon le revenu fiscal de référence.`,
    );
  }
  const territories = d.territories.map((t) => TERRITORY_LABELS[t]);
  lines.push(`Territoires évalués : ${frenchList(territories)}.`);
  return lines;
}

/** Démarches et calendrier : ce qu'il faut respecter avant et pendant les travaux. */
export function procedureLines(rules: RuleSetData, id: DispositifId): string[] {
  const d = rules.dispositifs[id];
  const lines: string[] = [];
  if (d.quoteMustNotBeSigned) {
    lines.push(
      d.quoteSignedGraceDays
        ? `La demande se fait avant de signer le devis (ou, pour un particulier, au plus tard ${d.quoteSignedGraceDays} jours après sa signature et avant le début des travaux).`
        : "La demande se fait avant de signer le devis.",
    );
  } else if (d.worksMustNotHaveStarted) {
    lines.push("La demande se fait avant le début des travaux.");
  }
  if (d.worksStartedExceptionNote) lines.push(d.worksStartedExceptionNote);
  if (d.requiresRge) lines.push("Les travaux doivent être réalisés par une entreprise titulaire du label RGE (Reconnu garant de l'environnement).");
  lines.push(...d.conditionsToVerify);
  for (const note of Object.values(d.occupancyNotes)) if (note) lines.push(note);
  if (id === "MPR_GESTE") {
    for (const r of rules.dispositifs.MPR_GESTE.dpeRestrictions) lines.push(capitalize(r.reason));
  }
  return [...new Set(lines)];
}

export interface WorkStatusLists {
  covered: WorkItem[];
  review: { item: WorkItem; reason: string }[];
  excluded: { item: WorkItem; reason: string }[];
}

export function aidWorks(rules: RuleSetData, id: DispositifId): WorkStatusLists {
  const d = rules.dispositifs[id];
  return { covered: [...d.eligibleWorks], review: [...d.reviewWorks], excluded: [...d.excludedWorks] };
}

/** Précisions propres à certains postes (ex. dépose de la cuve à fioul). */
export function workNotesFor(rules: RuleSetData, items: readonly WorkItem[]): { id: DispositifId; item: WorkItem; note: string }[] {
  const out: { id: DispositifId; item: WorkItem; note: string }[] = [];
  for (const g of enabledAidGuides(rules)) {
    const notes = rules.dispositifs[g.id].workNotes;
    for (const item of items) {
      const note = notes[item];
      if (note && rules.dispositifs[g.id].eligibleWorks.includes(item)) out.push({ id: g.id, item, note });
    }
  }
  return out;
}

export interface BonusInfo {
  title: string;
  works: WorkItem[];
  from: string;
  until: string;
  conditions: string;
  sources: SourceRef[];
  /** En cours à la date de référence (sinon : à venir). */
  current: boolean;
}

/** Bonifications temporaires des primes CEE en cours ou à venir (jamais celles déjà terminées). */
export function ceeBonuses(rules: RuleSetData, today: string, items?: readonly WorkItem[]): BonusInfo[] {
  const cee = rules.dispositifs.CEE;
  if (!cee.enabled) return [];
  return cee.temporaryBonuses
    .filter((b) => b.engagedUntil >= today)
    .filter((b) => !items || b.works.some((w) => items.includes(w)))
    .map((b) => ({
      title: b.title,
      works: b.works,
      from: b.engagedFrom,
      until: b.engagedUntil,
      conditions: b.conditions,
      sources: b.sources,
      current: b.engagedFrom <= today,
    }));
}

/** Coup de pouce Chauffage (CEE) quand il concerne les postes donnés. */
export function coupDePouce(rules: RuleSetData, today: string, items: readonly WorkItem[]) {
  const cee = rules.dispositifs.CEE;
  const c = cee.coupDePouceChauffage;
  if (!cee.enabled || !c.enabled || (c.validUntil !== null && c.validUntil < today)) return null;
  const targets = c.eligibleTargets.filter((t) => items.includes(t));
  if (targets.length === 0) return null;
  const replaced = c.replacedHeating.map((h) =>
    h === "CHAUDIERE_GAZ" && c.gasBoilerMustBeNonCondensing ? `${REPLACED_HEATING_LABELS[h]} (hors condensation)` : REPLACED_HEATING_LABELS[h],
  );
  return { targets, replaced, validUntil: c.validUntil, principalResidence: c.requiresPrincipalResidence, note: c.note ?? null, sources: c.sources };
}

/** Phrase de présentation du Coup de pouce Chauffage, à partir du barème. */
export function coupDePouceSentence(c: NonNullable<ReturnType<typeof coupDePouce>>): string {
  const targets = c.targets.map((t) => WORK_ITEMS[t].label.charAt(0).toLowerCase() + WORK_ITEMS[t].label.slice(1));
  return (
    `${c.principalResidence ? "Dans une résidence principale, les" : "Les"} primes CEE sont bonifiées pour remplacer ${frenchList(c.replaced, "ou")} ` +
    `par l'un de ces équipements : ${targets.join(", ")}${c.validUntil ? ` (jusqu'au ${longDate(c.validUntil)})` : ""}.`
  );
}

const REPLACED_HEATING_LABELS = {
  CHAUDIERE_GAZ: "une chaudière au gaz",
  CHAUDIERE_FIOUL: "une chaudière au fioul",
  CHAUDIERE_CHARBON: "une chaudière au charbon",
  ELECTRIQUE: "un chauffage électrique",
  BOIS: "un chauffage au bois",
  PAC: "une pompe à chaleur",
  RESEAU_CHALEUR: "un raccordement à un réseau de chaleur",
  AUTRE: "un autre équipement",
  INCONNU: "un équipement non précisé",
} as const;

/** Sources officielles, sans doublon, pour un ensemble de dispositifs. */
export function sourcesFor(rules: RuleSetData, ids: readonly DispositifId[]): SourceRef[] {
  const seen = new Set<string>();
  const out: SourceRef[] = [];
  for (const id of ids) {
    for (const s of rules.dispositifs[id].sources) {
      if (!seen.has(s.url)) {
        seen.add(s.url);
        out.push(s);
      }
    }
  }
  return out;
}

export const VERIFICATION_LABELS = {
  VERIFIED: "vérifiées",
  PARTIAL: "vérifiées partiellement",
  UNVERIFIED: "non vérifiées",
} as const;
