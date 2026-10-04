import { describe, expect, it } from "vitest";
import { evaluate } from "../evaluate";
import { DEFAULT_RULESET, RULESET_2026_10, RULESET_2026_10_2 } from "../index";
import { isQuestionVisible, pruneAnswers, type QuestionContext, summarizeAnswers } from "../questionnaire";
import type { Answers, DispositifId, Evaluation } from "../types";
import { selectedWorkItems } from "../works";
import { ELIGIBLE_PAC, NOT_ELIGIBLE, OUTRE_MER, REF } from "./fixtures";

const v2: QuestionContext = { rules: RULESET_2026_10_2.data, referenceDate: REF };
const v1: QuestionContext = { rules: RULESET_2026_10.data, referenceDate: REF };
const result = (e: Evaluation, id: DispositifId) => e.results.find((r) => r.id === id);

/** Propriétaire aux revenus supérieurs, chauffe-eau thermodynamique. */
const CET_SUPERIEUR: Answers = {
  ...ELIGIBLE_PAC,
  works: ["EAU_CHAUDE"],
  heatPumpType: undefined,
  hotWaterTarget: "CHAUFFE_EAU_THERMODYNAMIQUE",
  currentHeating: undefined,
  income: "SUPERIEUR",
};

const PAC_CUVE: Answers = { ...ELIGIBLE_PAC, oilTankRemoval: "OUI" };

describe("jeu de règles 2026.10-2", () => {
  it("est le jeu embarqué par défaut", () => {
    expect(DEFAULT_RULESET.version).toBe("2026.10-2");
  });

  describe("bonification CEE temporaire", () => {
    it("est mise en avant pour un chauffe-eau thermodynamique, quels que soient les revenus", () => {
      const e = evaluate(CET_SUPERIEUR, RULESET_2026_10_2, REF);
      const cee = result(e, "CEE");
      expect(cee?.status).toBe("POTENTIALLY_ELIGIBLE");
      expect(cee?.highlights).toHaveLength(1);
      expect(cee?.highlights?.[0]).toMatchObject({ kind: "TEMPORARY_BONUS", until: "2026-12-31", works: ["CHAUFFE_EAU_THERMODYNAMIQUE"] });
      expect(cee?.highlights?.[0]?.text).toContain("au plus tard le 31 décembre 2026");
      expect(cee?.highlights?.[0]?.text).not.toMatch(/\d+\s?€/);
      expect(e.outcome).toBe("POTENTIALLY_ELIGIBLE");
      // MaPrimeRénov' par geste ne finance plus les chauffe-eau thermodynamiques.
      expect(result(e, "MPR_GESTE")?.status).not.toBe("POTENTIALLY_ELIGIBLE");
    });

    it("n'apparaît pas avant ni après sa période d'engagement", () => {
      expect(result(evaluate(CET_SUPERIEUR, RULESET_2026_10_2, "2026-08-31"), "CEE")?.highlights).toBeUndefined();
      const after = { ...RULESET_2026_10_2, data: structuredClone(RULESET_2026_10_2.data) };
      after.data.dispositifs.CEE.validUntil = "2027-12-31";
      expect(result(evaluate(CET_SUPERIEUR, after, "2027-01-01"), "CEE")?.highlights).toBeUndefined();
      expect(result(evaluate(CET_SUPERIEUR, after, "2026-12-31"), "CEE")?.highlights).toHaveLength(1);
    });

    it("ne concerne que les travaux visés", () => {
      const isolation: Answers = { ...CET_SUPERIEUR, works: ["ISOLATION"], hotWaterTarget: undefined, insulationItems: ["ISOLATION_COMBLES_TOITURE"] };
      expect(result(evaluate(isolation, RULESET_2026_10_2, REF), "CEE")?.highlights).toBeUndefined();
    });

    it("n'existe pas dans la version 2026.10-1", () => {
      expect(result(evaluate(CET_SUPERIEUR, RULESET_2026_10, REF), "CEE")?.highlights).toBeUndefined();
    });

    it("n'est pas affichée quand les critères ne sont pas remplis", () => {
      const lateQuote: Answers = { ...CET_SUPERIEUR, quoteSigned: "OUI", quoteSignedRecency: "OLD" };
      const cee = result(evaluate(lateQuote, RULESET_2026_10_2, REF), "CEE");
      expect(cee?.status).toBe("NOT_ELIGIBLE");
      expect(cee?.highlights).toBeUndefined();
    });
  });

  describe("dépose d'une cuve à fioul", () => {
    it("n'est retenue qu'avec un chauffage au fioul remplacé", () => {
      expect(selectedWorkItems(PAC_CUVE)).toContain("DEPOSE_CUVE_FIOUL");
      expect(selectedWorkItems({ ...PAC_CUVE, currentHeating: "CHAUDIERE_GAZ" })).not.toContain("DEPOSE_CUVE_FIOUL");
      expect(selectedWorkItems({ ...PAC_CUVE, oilTankRemoval: "INCONNU" })).not.toContain("DEPOSE_CUVE_FIOUL");
      expect(
        selectedWorkItems({ ...PAC_CUVE, works: ["ISOLATION"], heatPumpType: undefined, insulationItems: ["ISOLATION_MURS"] }),
      ).not.toContain("DEPOSE_CUVE_FIOUL");
    });

    it("est couverte par MaPrimeRénov' par geste, avec la précision sur la demande conjointe", () => {
      const mpr = result(evaluate(PAC_CUVE, RULESET_2026_10_2, REF), "MPR_GESTE");
      expect(mpr?.status).toBe("POTENTIALLY_ELIGIBLE");
      expect(mpr?.coveredWorks).toEqual(["PAC_AIR_EAU", "DEPOSE_CUVE_FIOUL"]);
      expect(mpr?.notes.some((n) => n.includes("en même temps que celle du nouvel équipement"))).toBe(true);
      // La précision n'apparaît pas sans dépose de cuve.
      expect(result(evaluate(ELIGIBLE_PAC, RULESET_2026_10_2, REF), "MPR_GESTE")?.notes.some((n) => n.includes("cuve à fioul est aidée"))).toBe(false);
    });

    it("bénéficie de la dérogation d'ancienneté du remplacement d'une chaudière au fioul", () => {
      const recent: Answers = { ...PAC_CUVE, construction: { kind: "YEAR", year: 2015 } };
      const mpr = result(evaluate(recent, RULESET_2026_10_2, REF), "MPR_GESTE");
      expect(mpr?.status).toBe("POTENTIALLY_ELIGIBLE");
      expect(mpr?.coveredWorks).toEqual(["PAC_AIR_EAU", "DEPOSE_CUVE_FIOUL"]);
      expect(mpr?.criteria.find((c) => c.label.startsWith("Ancienneté"))?.label).toContain("dérogation");
    });

    it("n'est pas couverte par la version 2026.10-1", () => {
      const mpr = result(evaluate(PAC_CUVE, RULESET_2026_10, REF), "MPR_GESTE");
      expect(mpr?.coveredWorks).toEqual(["PAC_AIR_EAU"]);
      expect(mpr?.uncoveredWorks).toContain("DEPOSE_CUVE_FIOUL");
    });
  });

  describe("question sur la cuve", () => {
    it("n'est posée qu'avec un chauffage au fioul, un changement de chauffage et un barème qui l'évalue", () => {
      expect(isQuestionVisible("oilTankRemoval", ELIGIBLE_PAC, v2)).toBe(true);
      expect(isQuestionVisible("oilTankRemoval", ELIGIBLE_PAC, v1)).toBe(false);
      expect(isQuestionVisible("oilTankRemoval", { ...ELIGIBLE_PAC, currentHeating: "CHAUDIERE_GAZ" }, v2)).toBe(false);
      expect(
        isQuestionVisible("oilTankRemoval", { ...ELIGIBLE_PAC, works: ["ISOLATION"], heatPumpType: undefined, insulationItems: ["ISOLATION_MURS"] }, v2),
      ).toBe(false);
    });

    it("voit sa réponse supprimée quand elle n'a plus lieu d'être", () => {
      expect(pruneAnswers({ ...PAC_CUVE, currentHeating: "ELECTRIQUE" }, v2).oilTankRemoval).toBeUndefined();
      expect(pruneAnswers(PAC_CUVE, v2).oilTankRemoval).toBe("OUI");
      expect(pruneAnswers(PAC_CUVE, v1).oilTankRemoval).toBeUndefined();
    });

    it("figure dans le récapitulatif des réponses", () => {
      const lines = summarizeAnswers(PAC_CUVE, v2);
      expect(lines.find((l) => l.question === "oilTankRemoval")?.value).toBe("Oui");
      expect(lines.find((l) => l.label === "Détail des travaux")?.value).not.toContain("cuve");
    });
  });

  describe("le test n'affiche pas « éligible » à tout le monde", () => {
    it("les primes CEE sont ouvertes à tous les revenus, mais pas sans conditions", () => {
      expect(evaluate(CET_SUPERIEUR, RULESET_2026_10_2, REF).outcome).toBe("POTENTIALLY_ELIGIBLE");
      expect(evaluate(NOT_ELIGIBLE, RULESET_2026_10_2, REF).outcome).toBe("NOT_ELIGIBLE");
      expect(evaluate(OUTRE_MER, RULESET_2026_10_2, REF).outcome).toBe("OUT_OF_SCOPE");
      const started: Answers = { ...CET_SUPERIEUR, worksStarted: "OUI" };
      expect(result(evaluate(started, RULESET_2026_10_2, REF), "CEE")?.status).toBe("NOT_ELIGIBLE");
    });

    it("les revenus supérieurs restent exclus de MaPrimeRénov' par geste", () => {
      const e = evaluate({ ...ELIGIBLE_PAC, income: "SUPERIEUR" }, RULESET_2026_10_2, REF);
      expect(result(e, "MPR_GESTE")?.status).toBe("NOT_ELIGIBLE");
      expect(result(e, "CEE")?.status).toBe("POTENTIALLY_ELIGIBLE");
    });
  });
});
