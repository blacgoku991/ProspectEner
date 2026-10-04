import { DISPOSITIF_INFO } from "@/engine/coverage";
import type { DispositifId, DispositifStatus, Evaluation } from "@/engine/types";
import { workLabel } from "@/engine/works";

/**
 * Qualification avant rendez-vous : pour chaque aide potentiellement accessible (ou à vérifier),
 * les critères du moteur que le conseiller confirme avec la personne. Un rendez-vous ne peut être
 * fixé que si tous les critères d'au moins une aide sont confirmés.
 */

export interface QualificationItem {
  key: string;
  label: string;
  detail: string;
  /** Ce que les réponses au test indiquaient : rempli, ou à vérifier. */
  declared: "MET" | "UNKNOWN";
}

export interface QualificationGroup {
  id: DispositifId | "GENERAL";
  name: string;
  status: DispositifStatus | null;
  items: QualificationItem[];
}

export interface StoredQualification {
  aids: string[];
  checked: string[];
  byId: string;
  byName: string;
  at: string;
}

/** Critères qui ne se vérifient pas avec la personne (territoire déduit du code postal, entreprise RGE). */
const SKIPPED = new Set(["territoire", "rge"]);

/** Demandes sans test (rappel rapide) : conditions générales à vérifier. */
const GENERAL_GROUP: QualificationGroup = {
  id: "GENERAL",
  name: "Conditions générales (demande sans test)",
  status: null,
  items: [
    { key: "GENERAL:projet", label: "Projet de travaux couvert par une aide", detail: "Voir le guide des aides et les pages par type de travaux.", declared: "UNKNOWN" },
    { key: "GENERAL:statut", label: "Propriétaire, bailleur ou locataire du logement concerné", detail: "Les aides ne sont pas les mêmes selon le statut.", declared: "UNKNOWN" },
    { key: "GENERAL:logement", label: "Logement en France métropolitaine, achevé depuis plus de 2 ans", detail: "15 ans pour MaPrimeRénov' (sauf remplacement d'une chaudière au fioul).", declared: "UNKNOWN" },
    { key: "GENERAL:travaux", label: "Travaux non commencés", detail: "Les aides se demandent avant le début des travaux.", declared: "UNKNOWN" },
    { key: "GENERAL:devis", label: "Devis non signé", detail: "Ou signé il y a moins de 14 jours, pour la prime C2E.", declared: "UNKNOWN" },
  ],
};

export function qualificationGroups(evaluation: Evaluation | null): QualificationGroup[] {
  if (!evaluation) return [GENERAL_GROUP];
  return evaluation.results
    .filter((r) => (r.status === "POTENTIALLY_ELIGIBLE" || r.status === "NEEDS_REVIEW") && !r.conclusionDisabledReason)
    .map((r) => ({
      id: r.id,
      name: DISPOSITIF_INFO[r.id].name,
      status: r.status,
      items: r.criteria
        .filter((c) => (c.status === "MET" || c.status === "UNKNOWN") && !SKIPPED.has(c.id))
        .map((c) => ({
          key: `${r.id}:${c.id}`,
          label: c.id === "travaux" ? "Le projet porte sur des travaux couverts par cette aide" : c.label,
          detail: c.id === "travaux" ? `Travaux couverts : ${r.coveredWorks.map(workLabel).join(", ")}.` : c.detail,
          declared: c.status as "MET" | "UNKNOWN",
        })),
    }))
    .filter((g) => g.items.length > 0);
}

/** Aides dont tous les critères ont été confirmés. */
export function qualifiedAids(groups: QualificationGroup[], checked: ReadonlySet<string>): QualificationGroup["id"][] {
  return groups.filter((g) => g.items.every((i) => checked.has(i.key))).map((g) => g.id);
}

export const APPOINTMENT_MODES = {
  DOMICILE: "À domicile",
  VISIO: "En visio",
  TELEPHONE: "Par téléphone",
} as const;
export type AppointmentMode = keyof typeof APPOINTMENT_MODES;

export function aidName(id: string): string {
  return id === "GENERAL" ? "Conditions générales" : (DISPOSITIF_INFO[id as DispositifId]?.name ?? id);
}
