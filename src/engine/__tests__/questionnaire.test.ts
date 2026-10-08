import { describe, expect, it } from "vitest";
import { DEFAULT_RULESET } from "../index";
import {
  constructionPeriods,
  firstUnanswered,
  incomeOptions,
  isQuestionVisible,
  pruneAnswers,
  type QuestionContext,
  questionText,
  STEPS,
  summarizeAnswers,
  visibleQuestions,
} from "../questionnaire";
import { departementFromInsee, departementFromPostalCode, resolveTerritory, territoryFromDepartement } from "../territory";
import type { Answers } from "../types";
import { describeWorks, selectedWorkItems } from "../works";
import { evaluate } from "../evaluate";
import { formatEuros } from "../income";
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

  it("ordre du parcours : logement, foyer (revenus), projet, installation actuelle, situation, avancement", () => {
    const answers: Answers = { ...ELIGIBLE_PAC, heatEmitters: "RADIATEURS_FONTE", radiatorCount: 8, heatedArea: 110, boilerLocation: "GARAGE" };
    expect(visibleQuestions(answers, ctx)).toEqual([
      "location",
      "housingType",
      "householdSize",
      "income",
      "works",
      "heatPumpType",
      "currentHeating",
      "heatEmitters",
      "radiatorCount",
      "heatedArea",
      "boilerLocation",
      "oilTankRemoval",
      "occupancy",
      "residence",
      "construction",
      "quoteSigned",
      "worksStarted",
      "priorAidStatus",
      "contractor",
    ]);
    expect(firstUnanswered(answers, ctx)).toBe("oilTankRemoval");
    // Le foyer est demandé dès le début, avant le projet.
    expect(firstUnanswered({ postalCode: "69003", communeInsee: "69383", housingType: "MAISON" }, ctx)).toBe("householdSize");
  });

  it("locataire : revenus demandés à tous (orientation de la demande), sans changer le résultat", () => {
    const answers: Answers = { ...ELIGIBLE_PAC, occupancy: "LOCATAIRE" };
    expect(isQuestionVisible("householdSize", answers, ctx)).toBe(true);
    expect(isQuestionVisible("income", answers, ctx)).toBe(true);
    const { householdSize: _h, income: _i, ...withoutIncome } = answers;
    const a = evaluate(answers, DEFAULT_RULESET, REF);
    const b = evaluate(withoutIncome, DEFAULT_RULESET, REF);
    expect(a.results.map((r) => [r.id, r.status])).toEqual(b.results.map((r) => [r.id, r.status]));
  });

  it("isolation seule : revenus demandés, pas de question sur le chauffage", () => {
    const answers: Answers = { ...ELIGIBLE_PAC, works: ["ISOLATION"], insulationItems: ["ISOLATION_MURS"] };
    expect(isQuestionVisible("income", answers, ctx)).toBe(true);
    expect(isQuestionVisible("currentHeating", answers, ctx)).toBe(false);
    expect(isQuestionVisible("heatEmitters", answers, ctx)).toBe(false);
    expect(isQuestionVisible("heatedArea", answers, ctx)).toBe(false);
  });

  it("installation actuelle : radiateurs comptés seulement s'ils sont à eau, chaudière localisée seulement s'il y en a une", () => {
    expect(isQuestionVisible("radiatorCount", { ...ELIGIBLE_PAC, heatEmitters: "RADIATEURS_ACIER_ALU" }, ctx)).toBe(true);
    expect(isQuestionVisible("radiatorCount", { ...ELIGIBLE_PAC, heatEmitters: "RADIATEURS_ELECTRIQUES" }, ctx)).toBe(false);
    expect(isQuestionVisible("radiatorCount", { ...ELIGIBLE_PAC, heatEmitters: "PLANCHER_CHAUFFANT_EAU" }, ctx)).toBe(false);
    expect(isQuestionVisible("boilerLocation", ELIGIBLE_PAC, ctx)).toBe(true);
    expect(isQuestionVisible("boilerLocation", { ...ELIGIBLE_PAC, currentHeating: "ELECTRIQUE" }, ctx)).toBe(false);
    expect(isQuestionVisible("boilerLocation", { ...ELIGIBLE_PAC, currentHeating: "BOIS", heatEmitters: "POELE_CHEMINEE" }, ctx)).toBe(false);
    expect(isQuestionVisible("boilerLocation", { ...ELIGIBLE_PAC, currentHeating: "BOIS", heatEmitters: "RADIATEURS_FONTE" }, ctx)).toBe(true);
  });

  it("PAC air/eau d'un propriétaire occupant : revenus demandés", () => {
    expect(isQuestionVisible("householdSize", ELIGIBLE_PAC, ctx)).toBe(true);
    expect(isQuestionVisible("income", ELIGIBLE_PAC, ctx)).toBe(true);
  });

  it("rénovation globale : DPE et installation de chauffage demandés", () => {
    const answers: Answers = { ...ELIGIBLE_PAC, works: ["RENOVATION_GLOBALE"] };
    expect(isQuestionVisible("dpe", answers, ctx)).toBe(true);
    expect(isQuestionVisible("heatEmitters", answers, ctx)).toBe(true);
    expect(isQuestionVisible("heatedArea", answers, ctx)).toBe(true);
  });

  it("devis signé : la date de signature n'est demandée que si nécessaire", () => {
    expect(isQuestionVisible("quoteSignedRecency", { ...ELIGIBLE_PAC, quoteSigned: "NON" }, ctx)).toBe(false);
    expect(isQuestionVisible("quoteSignedRecency", { ...ELIGIBLE_PAC, quoteSigned: "OUI" }, ctx)).toBe(true);
  });

  it("« autre projet » seul : le questionnaire s'arrête après le projet", () => {
    const answers: Answers = { ...ELIGIBLE_PAC, works: ["AUTRE"] };
    const v = visibleQuestions(answers, ctx);
    expect(v).not.toContain("quoteSigned");
    expect(v).not.toContain("currentHeating");
    expect(v).toContain("income");
  });

  it("retour en arrière : une réponse modifiée supprime les réponses devenues inutiles", () => {
    const changed: Answers = {
      ...ELIGIBLE_PAC,
      heatEmitters: "RADIATEURS_FONTE",
      radiatorCount: 8,
      heatedArea: 110,
      works: ["ISOLATION"],
      insulationItems: ["ISOLATION_MURS"],
    };
    const pruned = pruneAnswers(changed, ctx);
    expect(pruned.heatPumpType).toBeUndefined();
    expect(pruned.currentHeating).toBeUndefined();
    expect(pruned.heatEmitters).toBeUndefined();
    expect(pruned.radiatorCount).toBeUndefined();
    expect(pruned.heatedArea).toBeUndefined();
    expect(pruned.income).toBe("MODESTE");
    expect(pruned.insulationItems).toEqual(["ISOLATION_MURS"]);
    // Radiateurs électriques : le nombre de radiateurs à eau n'a plus lieu d'être.
    expect(pruneAnswers({ ...ELIGIBLE_PAC, heatEmitters: "RADIATEURS_ELECTRIQUES", radiatorCount: 6 }, ctx).radiatorCount).toBeUndefined();
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
    const heating = summarizeAnswers({ ...ELIGIBLE_PAC, heatEmitters: "RADIATEURS_FONTE", radiatorCount: 8, heatedArea: "INCONNU", boilerLocation: "CAVE_SOUS_SOL" }, ctx);
    expect(heating.find((l) => l.question === "heatEmitters")?.value).toBe("Radiateurs à eau en fonte");
    expect(heating.find((l) => l.question === "radiatorCount")?.value).toBe("8");
    expect(heating.find((l) => l.question === "heatedArea")?.value).toBe("Je ne sais pas");
    expect(heating.find((l) => l.question === "boilerLocation")?.value).toBe("À la cave ou au sous-sol");
  });

  it("résumé dans l'ordre du parcours (ordre des étapes), une ligne par réponse", () => {
    const answers: Answers = { ...ELIGIBLE_PAC, heatEmitters: "RADIATEURS_FONTE", radiatorCount: 8, heatedArea: 120, boilerLocation: "CAVE_SOUS_SOL" };
    const lines = summarizeAnswers(answers, ctx);
    const order = visibleQuestions(answers, ctx);
    const rank = lines.map((l) => order.indexOf(l.question));
    expect(rank.every((r) => r >= 0)).toBe(true);
    expect(rank).toEqual([...rank].sort((a, b) => a - b));
    // Le foyer, demandé juste après le logement, n'est plus résumé en dernier.
    expect(lines.slice(0, 4).map((l) => l.question)).toEqual(["location", "housingType", "householdSize", "income"]);
    expect(lines.map((l) => l.label)).toEqual([
      "Localisation",
      "Type de logement",
      "Personnes dans le foyer",
      "Revenu fiscal de référence",
      "Travaux envisagés",
      "Détail des travaux",
      "Chauffage actuel",
      "Diffusion de la chaleur",
      "Radiateurs à eau",
      "Surface chauffée",
      "Emplacement de la chaudière",
      "Situation",
      "Usage du logement",
      "Construction",
      "Devis signé",
      "Travaux commencés",
      "Aide déjà demandée ou obtenue",
      "Entreprise",
    ]);
  });

  it("textes : foyer (finalités), revenus (sans répéter l'aide repliable), émetteurs", () => {
    const foyer = STEPS.find((s) => s.id === "foyer")!;
    expect(foyer.showSubtitle).toBe(true);
    expect(foyer.subtitle).toMatch(/barème de certaines aides/);
    expect(foyer.subtitle).toMatch(/si nous pouvons vous proposer un rendez-vous/);
    const income = questionText("income", ELIGIBLE_PAC, ctx);
    expect(income.help).toBe(`${ctx.rules.incomeCeilings.rfrNote} Aucun justificatif n'est demandé ici.`);
    expect(income.help).not.toMatch(/Vos références/);
    const emitters = questionText("heatEmitters", ELIGIBLE_PAC, ctx);
    expect(emitters.title).toBe("Comment la chaleur est-elle principalement diffusée dans le logement ?");
    expect(emitters.help).toMatch(/^Si plusieurs systèmes coexistent, choisissez le principal\. /);
  });

  it("revenus : catégorie de couleur indiquée avec chaque tranche", () => {
    const opts = incomeOptions({ ...ELIGIBLE_PAC, householdSize: 3 }, ctx);
    expect(opts?.[0]).toMatchObject({ value: "TRES_MODESTE", label: `Jusqu'à ${formatEuros(30540)}`, hint: "Revenus très modestes (profil bleu)" });
    expect(opts?.[1]).toMatchObject({ value: "MODESTE", label: `De ${formatEuros(30541)} à ${formatEuros(39148)}`, hint: "Revenus modestes (profil jaune)" });
  });

  it("description des travaux pour la phrase de demande", () => {
    expect(describeWorks(selectedWorkItems(ELIGIBLE_PAC))).toBe("pompe à chaleur air/eau");
    expect(describeWorks(["ISOLATION_MURS", "VMC_DOUBLE_FLUX"])).toBe(
      "isolation des murs (par l'intérieur ou l'extérieur) et vmc double flux",
    );
  });
});
