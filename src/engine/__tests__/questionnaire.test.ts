import { describe, expect, it } from "vitest";
import { DEFAULT_RULESET } from "../index";
import {
  constructionPeriods,
  firstUnanswered,
  incomeOptions,
  isQuestionVisible,
  pruneAnswers,
  type QuestionContext,
  summarizeAnswers,
  visibleQuestions,
} from "../questionnaire";
import { departementFromInsee, departementFromPostalCode, resolveTerritory, territoryFromDepartement } from "../territory";
import type { Answers } from "../types";
import { describeWorks, selectedWorkItems } from "../works";
import { ELIGIBLE_PAC, NOT_ELIGIBLE, REF } from "./fixtures";

const ctx: QuestionContext = { rules: DEFAULT_RULESET.data, referenceDate: REF };

describe("territoire", () => {
  it("déduit le département du code postal", () => {
    expect(departementFromPostalCode("75001")).toBe("75");
    expect(departementFromPostalCode("20000")).toBe("2A");
    expect(departementFromPostalCode("20200")).toBe("2B");
    expect(departementFromPostalCode("97400")).toBe("974");
    expect(departementFromPostalCode("98000")).toBe("980");
    expect(departementFromPostalCode("7500")).toBeNull();
    expect(departementFromPostalCode("00000")).toBeNull();
  });

  it("déduit le département du code INSEE (prioritaire)", () => {
    expect(departementFromInsee("2A004")).toBe("2A");
    expect(departementFromInsee("97411")).toBe("974");
    expect(resolveTerritory({ postalCode: "60000", communeInsee: "95001" }).territory).toBe("IDF");
  });

  it("classe les territoires", () => {
    expect(territoryFromDepartement("93")).toBe("IDF");
    expect(territoryFromDepartement("69")).toBe("METRO");
    expect(territoryFromDepartement("2B")).toBe("METRO");
    expect(territoryFromDepartement("972")).toBe("DROM");
    expect(territoryFromDepartement("975")).toBe("COM");
    expect(territoryFromDepartement(null)).toBe("INCONNU");
  });
});

describe("questionnaire conditionnel", () => {
  it("hors périmètre : seule la localisation est demandée", () => {
    expect(visibleQuestions({ postalCode: "97400" }, ctx)).toEqual(["location"]);
    expect(firstUnanswered({ postalCode: "97400" }, ctx)).toBeNull();
  });

  it("locataire : pas de question sur les revenus (inutile aux dispositifs évaluables)", () => {
    const answers: Answers = { ...ELIGIBLE_PAC, occupancy: "LOCATAIRE" };
    expect(isQuestionVisible("householdSize", answers, ctx)).toBe(false);
    expect(isQuestionVisible("income", answers, ctx)).toBe(false);
  });

  it("isolation seule : pas de question sur les revenus (MaPrimeRénov' par geste ne la couvre plus)", () => {
    const answers: Answers = { ...ELIGIBLE_PAC, works: ["ISOLATION"], insulationItems: ["ISOLATION_MURS"] };
    expect(isQuestionVisible("income", answers, ctx)).toBe(false);
    expect(isQuestionVisible("currentHeating", answers, ctx)).toBe(false);
  });

  it("PAC air/eau d'un propriétaire occupant : revenus demandés", () => {
    expect(isQuestionVisible("householdSize", ELIGIBLE_PAC, ctx)).toBe(true);
    expect(isQuestionVisible("income", ELIGIBLE_PAC, ctx)).toBe(true);
  });

  it("rénovation globale : DPE demandé, revenus non demandés (toutes catégories éligibles)", () => {
    const answers: Answers = { ...ELIGIBLE_PAC, works: ["RENOVATION_GLOBALE"] };
    expect(isQuestionVisible("dpe", answers, ctx)).toBe(true);
    expect(isQuestionVisible("income", answers, ctx)).toBe(false);
  });

  it("devis signé : la date de signature n'est demandée que si nécessaire", () => {
    expect(isQuestionVisible("quoteSignedRecency", { ...ELIGIBLE_PAC, quoteSigned: "NON" }, ctx)).toBe(false);
    expect(isQuestionVisible("quoteSignedRecency", { ...ELIGIBLE_PAC, quoteSigned: "OUI" }, ctx)).toBe(true);
  });

  it("« autre projet » seul : le questionnaire s'arrête après le logement et le projet", () => {
    const answers: Answers = { ...ELIGIBLE_PAC, works: ["AUTRE"] };
    const v = visibleQuestions(answers, ctx);
    expect(v).not.toContain("quoteSigned");
    expect(v).not.toContain("income");
  });

  it("retour en arrière : une réponse modifiée supprime les réponses devenues inutiles", () => {
    const changed: Answers = { ...ELIGIBLE_PAC, occupancy: "LOCATAIRE" };
    const pruned = pruneAnswers(changed, ctx);
    expect(pruned.income).toBeUndefined();
    expect(pruned.householdSize).toBeUndefined();
    expect(pruned.heatPumpType).toBe("PAC_AIR_EAU");
    // Les réponses toujours pertinentes sont conservées à l'identique.
    expect(pruneAnswers(ELIGIBLE_PAC, ctx)).toEqual(ELIGIBLE_PAC);
  });

  it("les tranches de revenus dépendent de la zone et de la taille du ménage", () => {
    const metro = incomeOptions({ ...ELIGIBLE_PAC, householdSize: 1 }, ctx);
    const idf = incomeOptions({ ...ELIGIBLE_PAC, postalCode: "75011", communeInsee: "75111", householdSize: 1 }, ctx);
    expect(metro?.[0]?.label).toBe("Jusqu'à 17 363 €");
    expect(idf?.[0]?.label).toBe("Jusqu'à 24 031 €");
    expect(metro?.at(-1)?.value).toBe("INCONNU");
  });

  it("périodes de construction calculées pour ne pas chevaucher le seuil de 15 ans", () => {
    const periods = constructionPeriods(REF);
    expect(periods.at(-2)).toMatchObject({ from: 2001, to: 2010 });
    expect(periods.at(-1)).toMatchObject({ from: 2011, to: null });
  });

  it("résumé lisible des réponses", () => {
    const lines = summarizeAnswers(NOT_ELIGIBLE, ctx);
    expect(lines.find((l) => l.question === "occupancy")?.value).toBe("Locataire");
    expect(lines.find((l) => l.label === "Détail des travaux")?.value).toMatch(/combles/);
  });

  it("description des travaux pour la phrase de demande", () => {
    expect(describeWorks(selectedWorkItems(ELIGIBLE_PAC))).toBe("pompe à chaleur air/eau");
    expect(describeWorks(["ISOLATION_MURS", "VMC_DOUBLE_FLUX"])).toBe(
      "isolation des murs (par l'intérieur ou l'extérieur) et vmc double flux",
    );
  });
});
