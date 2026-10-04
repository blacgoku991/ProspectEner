import { describe, expect, it } from "vitest";
import { DEFAULT_RULESET, evaluate } from "@/engine";
import type { Answers } from "@/engine/types";
import { qualificationGroups, qualifiedAids } from "./qualification";

const OWNER: Answers = {
  scope: "PROFILE",
  postalCode: "69003",
  communeInsee: "69383",
  communeName: "Lyon 3e Arrondissement",
  housingType: "MAISON",
  occupancy: "PROPRIETAIRE_OCCUPANT",
  residence: "PRINCIPALE",
  construction: { kind: "YEAR", year: 1985 },
  quoteSigned: "NON",
  worksStarted: "NON",
  householdSize: 3,
  income: "MODESTE",
};

describe("qualification avant rendez-vous", () => {
  it("propose les critères de chaque aide accessible, sans le territoire ni l'entreprise RGE", () => {
    const groups = qualificationGroups(evaluate(OWNER, DEFAULT_RULESET, "2026-10-04"));
    const ids = groups.map((g) => g.id);
    expect(ids).toEqual(expect.arrayContaining(["MPR_GESTE", "CEE", "ECO_PTZ", "MPR_AMPLEUR"]));
    const mpr = groups.find((g) => g.id === "MPR_GESTE")!;
    expect(mpr.items.map((i) => i.key)).toEqual(expect.arrayContaining(["MPR_GESTE:statut", "MPR_GESTE:revenus", "MPR_GESTE:travaux"]));
    expect(mpr.items.some((i) => i.key.endsWith(":territoire") || i.key.endsWith(":rge"))).toBe(false);
    expect(mpr.items.find((i) => i.key === "MPR_GESTE:travaux")?.detail).toContain("Pompe à chaleur air/eau");
    // La rénovation d'ampleur a un critère à vérifier (classe énergétique).
    expect(groups.find((g) => g.id === "MPR_AMPLEUR")?.items.some((i) => i.declared === "UNKNOWN")).toBe(true);
  });

  it("n'autorise un rendez-vous que si tous les critères d'au moins une aide sont confirmés", () => {
    const groups = qualificationGroups(evaluate(OWNER, DEFAULT_RULESET, "2026-10-04"));
    const cee = groups.find((g) => g.id === "CEE")!;
    const partial = new Set(cee.items.slice(1).map((i) => i.key));
    expect(qualifiedAids(groups, partial)).toEqual([]);
    expect(qualifiedAids(groups, new Set(cee.items.map((i) => i.key)))).toEqual(["CEE"]);
  });

  it("aucune aide à qualifier quand les critères ne sont pas remplis", () => {
    const e = evaluate({ ...OWNER, occupancy: "LOCATAIRE", worksStarted: "OUI", quoteSigned: "OUI", quoteSignedRecency: "OLD" }, DEFAULT_RULESET, "2026-10-04");
    expect(e.outcome).toBe("NOT_ELIGIBLE");
    expect(qualificationGroups(e)).toEqual([]);
  });

  it("demande sans test : conditions générales", () => {
    const [general] = qualificationGroups(null);
    expect(general?.id).toBe("GENERAL");
    expect(general?.items.length).toBeGreaterThanOrEqual(4);
  });
});
