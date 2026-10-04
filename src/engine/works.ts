import type { Answers, WorkCategory, WorkItem } from "./types";

export interface WorkItemInfo {
  label: string;
  category: WorkCategory;
  /** Vrai pour les réponses « je ne sais pas encore » : le moteur ne peut pas conclure. */
  undetermined?: boolean;
}

/**
 * Catalogue des travaux proposés. Il correspond exactement au périmètre évalué par
 * le moteur : chaque entrée est rattachée (ou explicitement non rattachée) à chaque
 * dispositif dans le jeu de règles.
 */
export const WORK_ITEMS: Record<WorkItem, WorkItemInfo> = {
  ISOLATION_COMBLES_TOITURE: { label: "Isolation des combles ou de la toiture", category: "ISOLATION" },
  ISOLATION_MURS: { label: "Isolation des murs (par l'intérieur ou l'extérieur)", category: "ISOLATION" },
  ISOLATION_PLANCHER_BAS: { label: "Isolation du plancher bas", category: "ISOLATION" },
  MENUISERIES: { label: "Remplacement de fenêtres / portes-fenêtres", category: "ISOLATION" },
  ISOLATION_INCONNU: { label: "Isolation (type à préciser)", category: "ISOLATION", undetermined: true },

  PAC_AIR_EAU: { label: "Pompe à chaleur air/eau", category: "PAC" },
  PAC_GEOTHERMIQUE: { label: "Pompe à chaleur géothermique", category: "PAC" },
  PAC_AIR_AIR: { label: "Pompe à chaleur air/air (climatisation réversible)", category: "PAC" },
  PAC_HYBRIDE: { label: "Pompe à chaleur hybride", category: "PAC" },
  PAC_INCONNU: { label: "Pompe à chaleur (type à préciser)", category: "PAC", undetermined: true },

  CHAUDIERE_BIOMASSE: { label: "Chaudière bois / granulés", category: "CHAUFFAGE" },
  POELE_INSERT_BOIS: { label: "Poêle ou insert à bois / granulés", category: "CHAUFFAGE" },
  RACCORDEMENT_RESEAU_CHALEUR: { label: "Raccordement à un réseau de chaleur", category: "CHAUFFAGE" },
  SYSTEME_SOLAIRE_COMBINE: { label: "Système solaire combiné (chauffage + eau chaude)", category: "CHAUFFAGE" },
  CHAUDIERE_GAZ: { label: "Nouvelle chaudière gaz", category: "CHAUFFAGE" },
  CHAUFFAGE_INCONNU: { label: "Changement de chauffage (équipement à préciser)", category: "CHAUFFAGE", undetermined: true },
  DEPOSE_CUVE_FIOUL: { label: "Dépose d'une cuve à fioul", category: "CHAUFFAGE" },

  CHAUFFE_EAU_THERMODYNAMIQUE: { label: "Chauffe-eau thermodynamique", category: "EAU_CHAUDE" },
  CHAUFFE_EAU_SOLAIRE: { label: "Chauffe-eau solaire individuel", category: "EAU_CHAUDE" },
  EAU_CHAUDE_INCONNU: { label: "Eau chaude sanitaire (équipement à préciser)", category: "EAU_CHAUDE", undetermined: true },

  VMC_DOUBLE_FLUX: { label: "VMC double flux", category: "VENTILATION" },
  VMC_SIMPLE_FLUX: { label: "VMC simple flux", category: "VENTILATION" },
  VENTILATION_INCONNU: { label: "Ventilation (type à préciser)", category: "VENTILATION", undetermined: true },

  RENOVATION_GLOBALE: { label: "Rénovation globale (plusieurs travaux, gain de classes énergétiques)", category: "RENOVATION_GLOBALE" },

  AUTRE_PROJET: { label: "Autre projet ou besoin de conseil", category: "AUTRE" },
};

export const WORK_CATEGORY_LABELS: Record<WorkCategory, string> = {
  ISOLATION: "Isolation",
  CHAUFFAGE: "Changement de chauffage",
  PAC: "Pompe à chaleur",
  EAU_CHAUDE: "Eau chaude sanitaire",
  VENTILATION: "Ventilation",
  RENOVATION_GLOBALE: "Rénovation globale",
  AUTRE: "Autre projet ou besoin de conseil",
};

export const INSULATION_CHOICES: WorkItem[] = [
  "ISOLATION_COMBLES_TOITURE",
  "ISOLATION_MURS",
  "ISOLATION_PLANCHER_BAS",
  "MENUISERIES",
  "ISOLATION_INCONNU",
];
export const HEAT_PUMP_CHOICES: WorkItem[] = ["PAC_AIR_EAU", "PAC_GEOTHERMIQUE", "PAC_HYBRIDE", "PAC_AIR_AIR", "PAC_INCONNU"];
export const HEATING_CHOICES: WorkItem[] = [
  "CHAUDIERE_BIOMASSE",
  "POELE_INSERT_BOIS",
  "RACCORDEMENT_RESEAU_CHALEUR",
  "SYSTEME_SOLAIRE_COMBINE",
  "CHAUDIERE_GAZ",
  "CHAUFFAGE_INCONNU",
];
export const HOT_WATER_CHOICES: WorkItem[] = ["CHAUFFE_EAU_THERMODYNAMIQUE", "CHAUFFE_EAU_SOLAIRE", "EAU_CHAUDE_INCONNU"];
export const VENTILATION_CHOICES: WorkItem[] = ["VMC_DOUBLE_FLUX", "VMC_SIMPLE_FLUX", "VENTILATION_INCONNU"];

const HEATING_ITEMS = new Set<WorkItem>([...HEAT_PUMP_CHOICES, ...HEATING_CHOICES]);

/** Liste dédupliquée des travaux précis sélectionnés, à partir des réponses. */
export function selectedWorkItems(answers: Answers): WorkItem[] {
  const out: WorkItem[] = [];
  const push = (item: WorkItem | undefined) => {
    if (item && !out.includes(item)) out.push(item);
  };
  const works = answers.works ?? [];
  for (const category of works) {
    switch (category) {
      case "ISOLATION": {
        const items = (answers.insulationItems ?? []).filter((i) => INSULATION_CHOICES.includes(i));
        if (items.length === 0) push("ISOLATION_INCONNU");
        items.forEach(push);
        break;
      }
      case "PAC":
        push(answers.heatPumpType && HEAT_PUMP_CHOICES.includes(answers.heatPumpType) ? answers.heatPumpType : "PAC_INCONNU");
        break;
      case "CHAUFFAGE":
        push(answers.heatingTarget && HEATING_CHOICES.includes(answers.heatingTarget) ? answers.heatingTarget : "CHAUFFAGE_INCONNU");
        break;
      case "EAU_CHAUDE":
        push(answers.hotWaterTarget && HOT_WATER_CHOICES.includes(answers.hotWaterTarget) ? answers.hotWaterTarget : "EAU_CHAUDE_INCONNU");
        break;
      case "VENTILATION":
        push(
          answers.ventilationTarget && VENTILATION_CHOICES.includes(answers.ventilationTarget)
            ? answers.ventilationTarget
            : "VENTILATION_INCONNU",
        );
        break;
      case "RENOVATION_GLOBALE":
        push("RENOVATION_GLOBALE");
        break;
      case "AUTRE":
        push("AUTRE_PROJET");
        break;
    }
  }
  // Dépose de la cuve : seulement en accompagnement d'un changement de chauffage depuis le fioul.
  if (answers.oilTankRemoval === "OUI" && answers.currentHeating === "CHAUDIERE_FIOUL" && involvesHeating(out)) push("DEPOSE_CUVE_FIOUL");
  return out;
}

/** Le projet concerne-t-il le système de chauffage ? */
export function involvesHeating(items: WorkItem[]): boolean {
  return items.some((i) => HEATING_ITEMS.has(i));
}

export function workLabel(item: WorkItem): string {
  return WORK_ITEMS[item].label;
}

/** Résumé court des travaux (pour la phrase de demande de contact). */
export function describeWorks(items: WorkItem[]): string {
  const labels = items.map((i) => WORK_ITEMS[i].label.toLowerCase());
  if (labels.length === 0) return "rénovation énergétique";
  if (labels.length === 1) return labels[0] as string;
  return `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;
}
