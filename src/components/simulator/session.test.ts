import { describe, expect, it } from "vitest";
import { DEFAULT_RULESET } from "@/engine";
import { ELIGIBLE_PAC, REF } from "@/engine/__tests__/fixtures";
import { firstUnanswered, type QuestionContext } from "@/engine/questionnaire";
import type { Answers } from "@/engine/types";
import { type Persisted, restoreSession } from "./session";

const ctx: QuestionContext = { rules: DEFAULT_RULESET.data, referenceDate: REF };

const COMPLETE: Answers = {
  ...ELIGIBLE_PAC,
  heatEmitters: "RADIATEURS_FONTE",
  radiatorCount: 8,
  heatedArea: 120,
  boilerLocation: "GARAGE",
  oilTankRemoval: "NON",
  dpe: "INCONNU",
};

const saved = (patch: Partial<Persisted>): Persisted => ({
  v: 1,
  ruleSetVersion: DEFAULT_RULESET.version,
  referenceDate: REF,
  answers: COMPLETE,
  current: "contractor",
  phase: "result",
  returnToResult: false,
  done: null,
  ...patch,
});

describe("session restaurée", () => {
  it("sans session : questionnaire depuis le début", () => {
    expect(restoreSession(null, ctx, "PROJET")).toEqual({
      answers: {},
      current: "location",
      phase: "questions",
      returnToResult: false,
      done: null,
    });
  });

  it("résultat rouvert tel quel quand le questionnaire est complet", () => {
    expect(firstUnanswered(COMPLETE, ctx)).toBeNull();
    const s = restoreSession(saved({}), ctx, "PROJET");
    expect(s.phase).toBe("result");
    expect(s.redirected).toBeUndefined();
  });

  it("résultat ou formulaire jamais rouverts sur des réponses incomplètes : première question manquante, puis retour au résultat", () => {
    const { heatEmitters: _e, heatedArea: _a, ...incomplete } = COMPLETE;
    for (const phase of ["result", "contact"] as const) {
      const s = restoreSession(saved({ answers: incomplete, phase }), ctx, "PROJET");
      expect(s).toMatchObject({ phase: "questions", current: "heatEmitters", returnToResult: true, redirected: true });
      expect(s.answers).toEqual(incomplete);
    }
  });

  it("portée du test imposée par les paramètres, et vérification faite après ce changement", () => {
    const s = restoreSession(saved({}), ctx, "ELIGIBILITE");
    expect(s.answers.scope).toBe("PROFILE");
    expect(s.phase).toBe(firstUnanswered(s.answers, ctx) === null ? "result" : "questions");
  });

  it("confirmation conservée (lien d'annulation), même si une question a été ajoutée depuis", () => {
    const done = { reference: "PE-TEST", cancelToken: "t", channel: "PHONE" as const, callbackDeadline: null, requestSentence: "…" };
    const s = restoreSession(saved({ answers: { postalCode: "69003" }, phase: "done", done }), ctx, "PROJET");
    expect(s.phase).toBe("done");
    expect(s.done).toEqual(done);
  });
});
