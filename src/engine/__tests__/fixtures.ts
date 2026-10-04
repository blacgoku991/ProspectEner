import type { Answers } from "../types";

/** Date de référence utilisée par les tests (seuils datés). */
export const REF = "2026-10-04";

/** Propriétaire occupant, maison de 1985 hors Île-de-France, PAC air/eau en remplacement d'une chaudière fioul. */
export const ELIGIBLE_PAC: Answers = {
  postalCode: "69003",
  communeInsee: "69383",
  communeName: "Lyon 3e Arrondissement",
  housingType: "MAISON",
  occupancy: "PROPRIETAIRE_OCCUPANT",
  residence: "PRINCIPALE",
  construction: { kind: "YEAR", year: 1985 },
  works: ["PAC"],
  heatPumpType: "PAC_AIR_EAU",
  currentHeating: "CHAUDIERE_FIOUL",
  quoteSigned: "NON",
  worksStarted: "NON",
  priorAidStatus: "NON",
  contractor: "NON_CHOISIE",
  householdSize: 3,
  income: "MODESTE",
};

/** Locataire d'une résidence secondaire, isolation des combles, devis signé depuis longtemps. */
export const NOT_ELIGIBLE: Answers = {
  postalCode: "33000",
  communeInsee: "33063",
  communeName: "Bordeaux",
  housingType: "APPARTEMENT",
  occupancy: "LOCATAIRE",
  residence: "SECONDAIRE",
  construction: { kind: "PERIOD", from: 1948, to: 1974 },
  works: ["ISOLATION"],
  insulationItems: ["ISOLATION_COMBLES_TOITURE"],
  quoteSigned: "OUI",
  quoteSignedRecency: "OLD",
  worksStarted: "NON",
  priorAidStatus: "NON",
  contractor: "RGE",
};

/** Réponses incomplètes (« je ne sais pas »). */
export const INCOMPLETE: Answers = {
  postalCode: "75011",
  communeInsee: "75111",
  communeName: "Paris 11e Arrondissement",
  housingType: "APPARTEMENT",
  occupancy: "PROPRIETAIRE_OCCUPANT",
  residence: "PRINCIPALE",
  construction: { kind: "UNKNOWN" },
  works: ["PAC"],
  heatPumpType: "PAC_INCONNU",
  currentHeating: "INCONNU",
  quoteSigned: "INCONNU",
  worksStarted: "NON",
  priorAidStatus: "INCONNU",
  contractor: "RGE_INCONNU",
  householdSize: 2,
  income: "INCONNU",
};

/** La Réunion : hors périmètre du simulateur. */
export const OUTRE_MER: Answers = {
  postalCode: "97400",
  communeInsee: "97411",
  communeName: "Saint-Denis",
};
