import { WORK_ITEMS } from "@/engine/works";
import { formatFrenchPhone } from "../validation/contact";
import { INCOME_PROFILE, type LeadProfile, leadLabels } from "./profile";

/**
 * Fiche d'une demande, dans l'ordre attendu par les entreprises partenaires : identité,
 * coordonnées, installation actuelle, logement, revenus. Utilisée par la fiche de
 * l'administration, le récapitulatif de rendez-vous et les exports.
 */
export interface LeadContact {
  firstName: string | null;
  lastName: string | null;
  streetAddress: string | null;
  postalCode: string | null;
  communeName: string | null;
  phone: string | null;
  email: string | null;
}

export interface LeadField {
  key: string;
  label: string;
  /** Valeur en clair ; null = non renseignée. */
  value: string | null;
}

export function leadContactFields(c: LeadContact): LeadField[] {
  return [
    { key: "lastName", label: "Nom", value: c.lastName },
    { key: "firstName", label: "Prénom", value: c.firstName },
    { key: "streetAddress", label: "Adresse", value: c.streetAddress },
    { key: "commune", label: "Code postal et commune", value: [c.postalCode, c.communeName].filter(Boolean).join(" ") || null },
    { key: "phone", label: "Téléphone", value: c.phone ? formatFrenchPhone(c.phone) : null },
    { key: "email", label: "E-mail", value: c.email },
  ];
}

export function leadProfileFields(p: LeadProfile): LeadField[] {
  return [
    { key: "works", label: "Travaux souhaités", value: p.workItems.length ? p.workItems.map((w) => WORK_ITEMS[w].label).join(", ") : null },
    { key: "currentHeating", label: "Mode de chauffage", value: leadLabels.currentHeating(p.currentHeating) },
    { key: "heatEmitters", label: "Diffusion de la chaleur", value: leadLabels.heatEmitters(p.heatEmitters) },
    { key: "radiatorCount", label: "Nombre de radiateurs", value: p.radiatorCount === null ? null : String(p.radiatorCount) },
    { key: "heatedArea", label: "Surface chauffée", value: p.heatedArea === null ? null : `${p.heatedArea} m²` },
    { key: "boilerLocation", label: "Emplacement de la chaudière", value: leadLabels.boilerLocation(p.boilerLocation) },
    { key: "housingType", label: "Logement", value: leadLabels.housingType(p.housingType) },
    { key: "construction", label: "Date de construction", value: leadLabels.construction(p.constructionYearMin, p.constructionYearMax) },
    { key: "occupancy", label: "Propriétaire ou locataire", value: leadLabels.occupancy(p.occupancy) },
    { key: "householdSize", label: "Personnes au foyer", value: p.householdSize === null ? null : String(p.householdSize) },
    {
      key: "income",
      label: "Revenus (déclaratif, à confirmer oralement avec la personne)",
      value: p.incomeCategory === null ? null : INCOME_PROFILE[p.incomeCategory].label,
    },
  ];
}

const EMPTY_CONTACT: LeadContact = { firstName: null, lastName: null, streetAddress: null, postalCode: null, communeName: null, phone: null, email: null };
const EMPTY_PROFILE: LeadProfile = {
  incomeCategory: null,
  householdSize: null,
  housingType: null,
  occupancy: null,
  currentHeating: null,
  heatEmitters: null,
  radiatorCount: null,
  heatedArea: null,
  boilerLocation: null,
  constructionYearMin: null,
  constructionYearMax: null,
  departement: null,
  workItems: [],
};

/** Colonnes de la fiche (exports), dans l'ordre attendu par les entreprises : identiques pour toutes les lignes. */
export const LEAD_FIELD_COLUMNS: Pick<LeadField, "key" | "label">[] = [...leadContactFields(EMPTY_CONTACT), ...leadProfileFields(EMPTY_PROFILE)].map(
  ({ key, label }) => ({ key, label }),
);
