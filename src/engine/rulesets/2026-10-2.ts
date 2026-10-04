import type { RuleSet } from "../ruleset-schema";
import { RULESET_2026_10 } from "./2026-10";

/**
 * Jeu de règles 2026.10-2 — compléments du 4 octobre 2026 à la version 2026.10-1.
 *
 * Écrit comme un différentiel explicite de la version précédente : seuls les points
 * ci-dessous changent. Même méthode et mêmes limites que 2026.10-1 (voir docs/REGLES.md).
 */

const base = RULESET_2026_10.data;
const { MPR_GESTE, CEE } = base.dispositifs;

export const RULESET_2026_10_2: RuleSet = {
  version: "2026.10-2",
  data: {
    ...base,
    meta: {
      label: "Règles en vigueur au 4 octobre 2026 (réforme du 1er septembre 2026, bonifications CEE temporaires)",
      changelog:
        "Ajouts par rapport à 2026.10-1 : bonification temporaire des primes CEE pour les chauffe-eau thermodynamiques et solaires (devis signés du 1er septembre au 31 décembre 2026, arrêté du 25 août 2026) ; dépose d'une cuve à fioul, toujours couverte par MaPrimeRénov' par geste, y compris avec la dérogation d'ancienneté du remplacement d'une chaudière au fioul ; rappel de l'absence de condition de revenus pour les primes CEE.",
    },
    dispositifs: {
      ...base.dispositifs,

      MPR_GESTE: {
        ...MPR_GESTE,
        verification: {
          ...MPR_GESTE.verification,
          notes:
            "l'éligibilité des pompes à chaleur hybrides depuis le 1er septembre 2026 et les modalités exactes de l'aide à la dépose d'une cuve à fioul.",
        },
        eligibleWorks: [...MPR_GESTE.eligibleWorks, "DEPOSE_CUVE_FIOUL"],
        ageExceptions: MPR_GESTE.ageExceptions.map((ex) =>
          ex.currentHeating.includes("CHAUDIERE_FIOUL") ? { ...ex, works: [...ex.works, "DEPOSE_CUVE_FIOUL"] } : ex,
        ),
        workNotes: {
          ...MPR_GESTE.workNotes,
          DEPOSE_CUVE_FIOUL:
            "La dépose de la cuve à fioul est aidée lorsqu'elle accompagne le remplacement de la chaudière au fioul : sa demande est déposée en même temps que celle du nouvel équipement de chauffage.",
        },
      },

      CEE: {
        ...CEE,
        verification: {
          ...CEE.verification,
          notes: `${CEE.verification.notes ?? ""} Portée exacte des bonifications temporaires de l'arrêté du 25 août 2026 (texte connu par extraits).`.trim(),
        },
        notes: [
          ...CEE.notes,
          "Les primes CEE sont accessibles sans condition de revenus ; leur montant est généralement plus élevé pour les ménages aux revenus modestes.",
        ],
        temporaryBonuses: [
          {
            title: "Primes énergie renforcées temporairement",
            works: ["CHAUFFE_EAU_THERMODYNAMIQUE", "CHAUFFE_EAU_SOLAIRE"],
            engagedFrom: "2026-09-01",
            engagedUntil: "2026-12-31",
            conditions:
              "le chauffage et l'eau chaude du logement ne reposent plus sur une énergie fossile après les travaux (conditions précises propres à chaque opération)",
            sources: [
              {
                label: "Ministère de la Transition écologique — Consultation publique sur le projet d'arrêté créant de nouvelles bonifications CEE",
                url: "https://www.consultations-publiques.developpement-durable.gouv.fr/projet-d-arrete-creant-de-nouvelles-bonifications-a3398.html",
              },
              {
                label: "Ministère de la Transition écologique — Opérations standardisées d'économies d'énergie",
                url: "https://www.ecologie.gouv.fr/politiques-publiques/operations-standardisees-deconomies-denergie",
              },
              {
                label: "Batirama (presse spécialisée) — MaPrimeRénov' et CEE : ce qui change dès le 1er septembre 2026",
                url: "https://www.batirama.com/article/107043-maprimerenov-et-les-cee-sont-modifies-au-1er-septembre-2026.html",
              },
            ],
          },
        ],
      },
    },
  },
};
