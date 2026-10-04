import type { Answers } from "./types";

/**
 * Scénarios de référence utilisés pour prévisualiser un brouillon de barème
 * (comparaison avec la version publiée avant toute publication).
 */
export interface ReferenceScenario {
  id: string;
  label: string;
  answers: Answers;
}

const base: Answers = {
  postalCode: "69003",
  communeInsee: "69383",
  communeName: "Lyon 3e Arrondissement",
  housingType: "MAISON",
  occupancy: "PROPRIETAIRE_OCCUPANT",
  residence: "PRINCIPALE",
  construction: { kind: "YEAR", year: 1985 },
  quoteSigned: "NON",
  worksStarted: "NON",
  priorAidStatus: "NON",
  contractor: "NON_CHOISIE",
  householdSize: 3,
  income: "MODESTE",
};

export const REFERENCE_SCENARIOS: ReferenceScenario[] = [
  {
    id: "pac-fioul",
    label: "Propriétaire occupant, PAC air/eau en remplacement d'une chaudière fioul, revenus modestes",
    answers: { ...base, works: ["PAC"], heatPumpType: "PAC_AIR_EAU", currentHeating: "CHAUDIERE_FIOUL" },
  },
  {
    id: "isolation-idf",
    label: "Appartement en Île-de-France, isolation des murs, revenus intermédiaires",
    answers: {
      ...base,
      postalCode: "75011",
      communeInsee: "75111",
      communeName: "Paris 11e Arrondissement",
      housingType: "APPARTEMENT",
      works: ["ISOLATION"],
      insulationItems: ["ISOLATION_MURS"],
      income: "INTERMEDIAIRE",
    },
  },
  {
    id: "locataire-cet",
    label: "Locataire, chauffe-eau thermodynamique",
    answers: { ...base, occupancy: "LOCATAIRE", works: ["EAU_CHAUDE"], hotWaterTarget: "CHAUFFE_EAU_THERMODYNAMIQUE", householdSize: undefined, income: undefined },
  },
  {
    id: "ampleur-f",
    label: "Rénovation globale, logement classé F, revenus supérieurs",
    answers: { ...base, works: ["RENOVATION_GLOBALE"], dpe: "F", currentHeating: "CHAUDIERE_GAZ", income: "SUPERIEUR" },
  },
  {
    id: "bailleur-reseau",
    label: "Bailleur, logement de 2018 chauffé au gaz, raccordement à un réseau de chaleur",
    answers: {
      ...base,
      occupancy: "PROPRIETAIRE_BAILLEUR",
      construction: { kind: "YEAR", year: 2018 },
      works: ["CHAUFFAGE"],
      heatingTarget: "RACCORDEMENT_RESEAU_CHALEUR",
      currentHeating: "CHAUDIERE_GAZ",
    },
  },
  {
    id: "pac-air-air-devis",
    label: "PAC air/air, devis signé il y a plus de 14 jours",
    answers: { ...base, works: ["PAC"], heatPumpType: "PAC_AIR_AIR", currentHeating: "ELECTRIQUE", quoteSigned: "OUI", quoteSignedRecency: "OLD" },
  },
  {
    id: "vmc",
    label: "VMC double flux, entreprise RGE choisie",
    answers: { ...base, works: ["VENTILATION"], ventilationTarget: "VMC_DOUBLE_FLUX", contractor: "RGE" },
  },
  {
    id: "outre-mer",
    label: "Logement à La Réunion",
    answers: { postalCode: "97400", communeInsee: "97411", communeName: "Saint-Denis" },
  },
];
