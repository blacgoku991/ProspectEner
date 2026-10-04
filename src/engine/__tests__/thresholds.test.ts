import { describe, expect, it } from "vitest";
import { checkMinimumAge } from "../construction";
import { evaluate } from "../evaluate";
import {
  ceilingsFor,
  describeBracket,
  incomeBrackets,
  incomeCategoryFor,
  type IncomeCeilingTable,
} from "../income";
import { DEFAULT_RULESET } from "../index";
import { incomeTable, validateRuleSetData } from "../ruleset-schema";
import { ELIGIBLE_PAC, REF } from "./fixtures";

const IDF = incomeTable(DEFAULT_RULESET.data, "IDF");
const HORS_IDF = incomeTable(DEFAULT_RULESET.data, "HORS_IDF");

describe("plafonds de ressources 2026 — valeurs exactement aux seuils", () => {
  it("hors Île-de-France, 1 personne : bornes incluses", () => {
    expect(incomeCategoryFor(17363, 1, HORS_IDF)).toBe("TRES_MODESTE");
    expect(incomeCategoryFor(17364, 1, HORS_IDF)).toBe("MODESTE");
    expect(incomeCategoryFor(22259, 1, HORS_IDF)).toBe("MODESTE");
    expect(incomeCategoryFor(22260, 1, HORS_IDF)).toBe("INTERMEDIAIRE");
    expect(incomeCategoryFor(31185, 1, HORS_IDF)).toBe("INTERMEDIAIRE");
    expect(incomeCategoryFor(31186, 1, HORS_IDF)).toBe("SUPERIEUR");
    expect(incomeCategoryFor(0, 1, HORS_IDF)).toBe("TRES_MODESTE");
  });

  it("Île-de-France, 5 personnes : bornes incluses", () => {
    expect(incomeCategoryFor(56580, 5, IDF)).toBe("TRES_MODESTE");
    expect(incomeCategoryFor(56581, 5, IDF)).toBe("MODESTE");
    expect(incomeCategoryFor(68877, 5, IDF)).toBe("MODESTE");
    expect(incomeCategoryFor(96817, 5, IDF)).toBe("INTERMEDIAIRE");
    expect(incomeCategoryFor(96818, 5, IDF)).toBe("SUPERIEUR");
  });

  it("au-delà de 5 personnes : majoration par personne supplémentaire", () => {
    expect(ceilingsFor(HORS_IDF, 6)).toEqual([40835 + 5151, 52348 + 6598, 73907 + 9357]);
    expect(ceilingsFor(IDF, 7)).toEqual([56580 + 2 * 7116, 68877 + 2 * 8663, 96817 + 2 * 12257]);
    expect(incomeCategoryFor(40835 + 5151, 6, HORS_IDF)).toBe("TRES_MODESTE");
    expect(incomeCategoryFor(40835 + 5152, 6, HORS_IDF)).toBe("MODESTE");
  });

  it("les tranches affichées sont cohérentes avec la catégorisation (toutes tailles, toutes zones)", () => {
    const tables: [string, IncomeCeilingTable][] = [
      ["IDF", IDF],
      ["HORS_IDF", HORS_IDF],
    ];
    for (const [, table] of tables) {
      for (let size = 1; size <= 10; size++) {
        const brackets = incomeBrackets(table, size);
        expect(brackets).toHaveLength(4);
        for (const b of brackets) {
          if (b.min !== null) expect(incomeCategoryFor(b.min, size, table)).toBe(b.category);
          if (b.max !== null) expect(incomeCategoryFor(b.max, size, table)).toBe(b.category);
          if (b.min !== null) expect(incomeCategoryFor(b.min - 1, size, table)).not.toBe(b.category);
          if (b.max !== null) expect(incomeCategoryFor(b.max + 1, size, table)).not.toBe(b.category);
        }
      }
    }
  });

  it("libellés des tranches", () => {
    const [a, b, , d] = incomeBrackets(HORS_IDF, 1);
    expect(describeBracket(a!)).toBe("Jusqu'à 17 363 €");
    expect(describeBracket(b!)).toBe("De 17 364 € à 22 259 €");
    expect(describeBracket(d!)).toBe("Plus de 31 185 €");
  });

  it("refuse une taille de ménage ou un revenu invalide", () => {
    expect(() => ceilingsFor(HORS_IDF, 0)).toThrow();
    expect(() => ceilingsFor(HORS_IDF, 2.5)).toThrow();
    expect(() => incomeCategoryFor(-1, 1, HORS_IDF)).toThrow();
    expect(() => incomeCategoryFor(Number.NaN, 1, HORS_IDF)).toThrow();
  });

  it("le revenu « exactement au plafond » change bien le résultat MaPrimeRénov'", () => {
    // 3 personnes hors IdF : plafond intermédiaire = 55 196 € (inclus) → tranche INTERMEDIAIRE éligible.
    const ok = evaluate({ ...ELIGIBLE_PAC, income: "INTERMEDIAIRE" }, DEFAULT_RULESET, REF);
    expect(ok.results.find((r) => r.id === "MPR_GESTE")?.status).toBe("POTENTIALLY_ELIGIBLE");
    expect(incomeCategoryFor(55196, 3, HORS_IDF)).toBe("INTERMEDIAIRE");
    expect(incomeCategoryFor(55197, 3, HORS_IDF)).toBe("SUPERIEUR");
  });
});

describe("ancienneté du logement — valeurs exactement aux seuils", () => {
  it("seuil de 15 ans au 4 octobre 2026 : l'année 2011 est charnière", () => {
    expect(checkMinimumAge({ kind: "YEAR", year: 2010 }, 15, REF)).toBe("MET");
    expect(checkMinimumAge({ kind: "YEAR", year: 2011 }, 15, REF)).toBe("UNKNOWN");
    expect(checkMinimumAge({ kind: "YEAR", year: 2012 }, 15, REF)).toBe("NOT_MET");
  });

  it("le 31 décembre, l'année charnière est acquise", () => {
    expect(checkMinimumAge({ kind: "YEAR", year: 2011 }, 15, "2026-12-31")).toBe("MET");
    expect(checkMinimumAge({ kind: "YEAR", year: 2012 }, 15, "2026-12-31")).toBe("NOT_MET");
  });

  it("seuil de 2 ans", () => {
    expect(checkMinimumAge({ kind: "YEAR", year: 2023 }, 2, REF)).toBe("MET");
    expect(checkMinimumAge({ kind: "YEAR", year: 2024 }, 2, REF)).toBe("UNKNOWN");
    expect(checkMinimumAge({ kind: "YEAR", year: 2025 }, 2, REF)).toBe("NOT_MET");
  });

  it("périodes : certain seulement si toute la période est du même côté du seuil", () => {
    expect(checkMinimumAge({ kind: "PERIOD", from: null, to: 1947 }, 15, REF)).toBe("MET");
    expect(checkMinimumAge({ kind: "PERIOD", from: 2001, to: 2010 }, 15, REF)).toBe("MET");
    expect(checkMinimumAge({ kind: "PERIOD", from: 2001, to: 2011 }, 15, REF)).toBe("UNKNOWN");
    expect(checkMinimumAge({ kind: "PERIOD", from: 2011, to: null }, 15, REF)).toBe("UNKNOWN");
    expect(checkMinimumAge({ kind: "PERIOD", from: 2012, to: null }, 15, REF)).toBe("NOT_MET");
    expect(checkMinimumAge({ kind: "PERIOD", from: 2011, to: null }, 2, REF)).toBe("UNKNOWN");
    expect(checkMinimumAge({ kind: "PERIOD", from: 1948, to: 1974 }, 2, REF)).toBe("MET");
  });

  it("réponse inconnue ou incohérente → à vérifier", () => {
    expect(checkMinimumAge({ kind: "UNKNOWN" }, 15, REF)).toBe("UNKNOWN");
    expect(checkMinimumAge(undefined, 15, REF)).toBe("UNKNOWN");
    expect(checkMinimumAge({ kind: "YEAR", year: 2030 }, 15, REF)).toBe("UNKNOWN");
    expect(checkMinimumAge({ kind: "PERIOD", from: 2000, to: 1990 }, 15, REF)).toBe("UNKNOWN");
  });

  it("l'année charnière produit « à vérifier » dans le résultat, pas une conclusion", () => {
    const e = evaluate({ ...ELIGIBLE_PAC, currentHeating: "CHAUDIERE_GAZ", construction: { kind: "YEAR", year: 2011 } }, DEFAULT_RULESET, REF);
    const mpr = e.results.find((r) => r.id === "MPR_GESTE");
    expect(mpr?.status).toBe("NEEDS_REVIEW");
    expect(mpr?.criteria.find((c) => c.id === "anciennete")?.detail).toMatch(/date exacte/);
  });
});

describe("validation du jeu de règles", () => {
  it("le jeu de règles embarqué est valide", () => {
    const r = validateRuleSetData(DEFAULT_RULESET.data);
    expect(r.ok).toBe(true);
  });

  it("refuse des plafonds non croissants", () => {
    const data = structuredClone(DEFAULT_RULESET.data);
    data.incomeCeilings.IDF.bySize[2] = [10, 20, 30];
    const r = validateRuleSetData(data);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toMatch(/non croissants/);
  });

  it("refuse une source non HTTPS ou une date invalide", () => {
    const data = structuredClone(DEFAULT_RULESET.data);
    data.dispositifs.CEE.sources[0]!.url = "http://exemple.fr";
    data.dispositifs.CEE.validFrom = "2026-13-01";
    const r = validateRuleSetData(data);
    expect(r.ok).toBe(false);
  });
});
