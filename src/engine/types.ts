/**
 * Types du moteur de pré-éligibilité.
 *
 * Le moteur est volontairement indépendant de l'interface, de la base de données
 * et du framework : il reçoit des réponses + un jeu de règles versionné + une date
 * de référence, et renvoie un résultat déterministe et expliqué.
 */

/** Version de la logique du moteur (code). Les barèmes ont leur propre version. */
export const ENGINE_VERSION = "1.2.0";

// ─── Réponses ────────────────────────────────────────────────────────────────

export type HousingType = "MAISON" | "APPARTEMENT";

export type Occupancy =
  | "PROPRIETAIRE_OCCUPANT"
  | "PROPRIETAIRE_BAILLEUR"
  | "LOCATAIRE"
  /** Usufruitier, occupant à titre gratuit, SCI, indivision… */
  | "AUTRE";

/**
 * Usage du logement.
 * - Occupant : PRINCIPALE = résidence principale ; SECONDAIRE = résidence secondaire.
 * - Bailleur : PRINCIPALE = loué (ou à louer) comme résidence principale du locataire ;
 *   AUTRE = location saisonnière, logement vacant sans projet de location, etc.
 */
export type ResidenceUse = "PRINCIPALE" | "SECONDAIRE" | "AUTRE";

export type ConstructionAnswer =
  | { kind: "YEAR"; year: number }
  /** Période (années incluses). `from`/`to` null = borne ouverte. */
  | { kind: "PERIOD"; from: number | null; to: number | null }
  | { kind: "UNKNOWN" };

export type CurrentHeating =
  | "CHAUDIERE_GAZ"
  | "CHAUDIERE_FIOUL"
  | "CHAUDIERE_CHARBON"
  | "ELECTRIQUE"
  | "BOIS"
  | "PAC"
  | "RESEAU_CHALEUR"
  | "AUTRE"
  | "INCONNU";

export type YesNoUnknown = "OUI" | "NON" | "INCONNU";

export type DpeAnswer = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "INCONNU";

/** Grandes familles de travaux proposées au visiteur. */
export type WorkCategory =
  | "ISOLATION"
  | "CHAUFFAGE"
  | "PAC"
  | "EAU_CHAUDE"
  | "VENTILATION"
  | "RENOVATION_GLOBALE"
  | "AUTRE";

/** Travaux précis évalués par le moteur. */
export type WorkItem =
  // Isolation
  | "ISOLATION_COMBLES_TOITURE"
  | "ISOLATION_MURS"
  | "ISOLATION_PLANCHER_BAS"
  | "MENUISERIES"
  | "ISOLATION_INCONNU"
  // Pompes à chaleur
  | "PAC_AIR_EAU"
  | "PAC_GEOTHERMIQUE"
  | "PAC_AIR_AIR"
  | "PAC_HYBRIDE"
  | "PAC_INCONNU"
  // Autres chauffages
  | "CHAUDIERE_BIOMASSE"
  | "POELE_INSERT_BOIS"
  | "RACCORDEMENT_RESEAU_CHALEUR"
  | "SYSTEME_SOLAIRE_COMBINE"
  | "CHAUDIERE_GAZ"
  | "CHAUFFAGE_INCONNU"
  /** Ajoutée par la question complémentaire posée lors du remplacement d'une chaudière fioul. */
  | "DEPOSE_CUVE_FIOUL"
  // Eau chaude sanitaire
  | "CHAUFFE_EAU_THERMODYNAMIQUE"
  | "CHAUFFE_EAU_SOLAIRE"
  | "EAU_CHAUDE_INCONNU"
  // Ventilation
  | "VMC_DOUBLE_FLUX"
  | "VMC_SIMPLE_FLUX"
  | "VENTILATION_INCONNU"
  // Rénovation globale
  | "RENOVATION_GLOBALE"
  // Hors périmètre
  | "AUTRE_PROJET";

export type IncomeCategory = "TRES_MODESTE" | "MODESTE" | "INTERMEDIAIRE" | "SUPERIEUR";
export type IncomeAnswer = IncomeCategory | "INCONNU";

export type ContractorAnswer = "NON_CHOISIE" | "RGE" | "NON_RGE" | "RGE_INCONNU";

export type PriorAidKind = "MAPRIMERENOV" | "CEE" | "ECO_PTZ" | "AUTRE";

export interface Answers {
  /**
   * Portée du test. « PROFILE » : test d'éligibilité seul (logement, avancement, foyer), sans le détail
   * du projet ; chaque dispositif est alors évalué pour l'ensemble des travaux qu'il couvre, et le projet
   * est précisé ensuite avec un conseiller. Absent : test complet, avec les travaux envisagés.
   */
  scope?: "PROFILE";
  // A. Logement
  postalCode?: string;
  communeInsee?: string;
  communeName?: string;
  /** Département déduit de la commune choisie (ex. "75", "2A", "974"). */
  departement?: string;
  housingType?: HousingType;
  occupancy?: Occupancy;
  residence?: ResidenceUse;
  construction?: ConstructionAnswer;
  // C. Projet
  works?: WorkCategory[];
  insulationItems?: WorkItem[];
  heatPumpType?: WorkItem;
  heatingTarget?: WorkItem;
  hotWaterTarget?: WorkItem;
  ventilationTarget?: WorkItem;
  // B. Situation énergétique
  currentHeating?: CurrentHeating;
  gasBoilerCondensing?: YesNoUnknown;
  /** Dépose de la cuve envisagée (question posée si le chauffage actuel est une chaudière fioul). */
  oilTankRemoval?: YesNoUnknown;
  dpe?: DpeAnswer;
  // Avancement
  quoteSigned?: YesNoUnknown;
  /** Si devis signé : signé depuis moins (RECENT) ou plus (OLD) que le délai de grâce du barème. */
  quoteSignedRecency?: "RECENT" | "OLD" | "INCONNU";
  worksStarted?: YesNoUnknown;
  priorAidStatus?: YesNoUnknown;
  priorAids?: PriorAidKind[];
  contractor?: ContractorAnswer;
  // D. Foyer
  householdSize?: number;
  income?: IncomeAnswer;
}

// ─── Territoire ─────────────────────────────────────────────────────────────

export type Territory =
  /** Île-de-France */
  | "IDF"
  /** Autres territoires métropolitains (Corse incluse) */
  | "METRO"
  /** Départements et régions d'outre-mer */
  | "DROM"
  /** Collectivités d'outre-mer (Saint-Martin, Saint-Barthélemy, SPM, Pacifique…) */
  | "COM"
  | "HORS_FRANCE"
  | "INCONNU";

// ─── Résultats ──────────────────────────────────────────────────────────────

export type CriterionStatus = "MET" | "NOT_MET" | "UNKNOWN" | "NOT_APPLICABLE";

export interface CriterionResult {
  id: string;
  label: string;
  status: CriterionStatus;
  /** Explication en langage clair, affichable au visiteur. */
  detail: string;
  /** Réponses du questionnaire ayant conduit à ce critère. */
  answerKeys: (keyof Answers)[];
}

export type DispositifId = "MPR_GESTE" | "MPR_AMPLEUR" | "CEE" | "ECO_PTZ";

export type AidKind = "SUBVENTION" | "PRIME" | "PRET";

export type DispositifStatus =
  /** 1. Potentiellement éligible */
  | "POTENTIALLY_ELIGIBLE"
  /** 2. Critères non remplis selon les réponses fournies */
  | "NOT_ELIGIBLE"
  /** 3. Informations insuffisantes ou vérification complémentaire nécessaire */
  | "NEEDS_REVIEW"
  /** Territoire ou projet non pris en charge par le simulateur */
  | "OUT_OF_SCOPE"
  /** Dispositif sans rapport avec les travaux sélectionnés (non affiché comme résultat) */
  | "NOT_CONCERNED";

export interface SourceRef {
  label: string;
  url: string;
}

/** Information mise en avant avec un résultat (ex. bonification temporaire datée), sans montant. */
export interface ResultHighlight {
  kind: "TEMPORARY_BONUS";
  title: string;
  text: string;
  /** Dernier jour couvert (AAAA-MM-JJ). */
  until: string;
  works: WorkItem[];
  sources: SourceRef[];
}

export interface DispositifResult {
  id: DispositifId;
  name: string;
  aidKind: AidKind;
  /** Qui finance / octroie (ex. « Anah (État) », « fournisseurs d'énergie (CEE) »). */
  provider: string;
  status: DispositifStatus;
  /** Phrase de synthèse, prudente et non engageante. */
  summary: string;
  criteria: CriterionResult[];
  /** Travaux sélectionnés susceptibles d'entrer dans ce dispositif. */
  coveredWorks: WorkItem[];
  /** Travaux sélectionnés non couverts par ce dispositif. */
  uncoveredWorks: WorkItem[];
  /** Conditions restant à vérifier même en cas de résultat favorable. */
  remainingConditions: string[];
  /** Informations complémentaires (bonifications possibles, nature de l'aide…), sans montant. */
  notes: string[];
  /** Informations datées à mettre en avant (bonifications temporaires…). */
  highlights?: ResultHighlight[];
  sources: SourceRef[];
  verifiedAt: string;
  validFrom: string;
  validUntil: string | null;
  /** Renseigné quand la conclusion est désactivée (règle non vérifiable, barème expiré…). */
  conclusionDisabledReason?: string;
  /** Points non confirmés lors de la dernière vérification des règles (vérification partielle). */
  verificationNote?: string;
}

export type OverallOutcome =
  | "POTENTIALLY_ELIGIBLE"
  | "NEEDS_REVIEW"
  | "NOT_ELIGIBLE"
  | "OUT_OF_SCOPE";

export interface Evaluation {
  engineVersion: string;
  ruleSetVersion: string;
  /** Date de référence (AAAA-MM-JJ, Europe/Paris) utilisée pour les seuils datés. */
  referenceDate: string;
  territory: Territory;
  departement: string | null;
  incomeZone: "IDF" | "HORS_IDF" | null;
  /** Test d'éligibilité seul : chaque dispositif a été évalué pour l'ensemble des travaux qu'il couvre. */
  scope?: "PROFILE";
  selectedWorks: WorkItem[];
  outcome: OverallOutcome;
  /** Message principal affiché au visiteur. */
  headline: string;
  results: DispositifResult[];
  /** Messages d'information généraux (périmètre, aides locales…). */
  notices: string[];
}
