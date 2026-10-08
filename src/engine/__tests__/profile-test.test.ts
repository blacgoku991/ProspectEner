import { describe, expect, it } from "vitest";
import { evaluate, PROFILE_HEADLINES } from "../evaluate";
import { DEFAULT_RULESET } from "../index";
import { firstUnanswered, pruneAnswers, type QuestionContext, visibleQuestions } from "../questionnaire";
import type { Answers, DispositifId, Evaluation } from "../types";
import { REF } from "./fixtures";

const ctx: QuestionContext = { rules: DEFAULT_RULESET.data, referenceDate: REF };
const rules = DEFAULT_RULESET.data;
const status = (e: Evaluation, id: DispositifId) => e.results.find((r) => r.id === id)?.status;

/** Test d'éligibilité seul : propriétaire occupant aux revenus modestes, maison de 1985 à Lyon. */
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

const TENANT: Answers = {
  scope: "PROFILE",
  postalCode: "33000",
  communeInsee: "33063",
  communeName: "Bordeaux",
  housingType: "APPARTEMENT",
  occupancy: "LOCATAIRE",
  residence: "PRINCIPALE",
  construction: { kind: "PERIOD", from: 1948, to: 1974 },
  quoteSigned: "NON",
  worksStarted: "NON",
};

describe("test d'éligibilité seul (sans le détail du projet)", () => {
  it("ne pose que les questions de logement, de foyer, de situation et d'avancement", () => {
    expect(visibleQuestions(OWNER, ctx)).toEqual([
      "location",
      "housingType",
      "householdSize",
      "income",
      "occupancy",
      "residence",
      "construction",
      "quoteSigned",
      "worksStarted",
    ]);
    expect(firstUnanswered(OWNER, ctx)).toBeNull();
    // Le foyer est demandé à tous, dès le début (orientation de la demande).
    expect(firstUnanswered(TENANT, ctx)).toBe("householdSize");
    expect(visibleQuestions({ ...OWNER, quoteSigned: "OUI" }, ctx)).toContain("quoteSignedRecency");
  });

  it("ignore les réponses sur le projet et conserve la portée du test", () => {
    const pruned = pruneAnswers({ ...OWNER, works: ["PAC"], heatPumpType: "PAC_AIR_EAU", currentHeating: "CHAUDIERE_FIOUL", dpe: "F" }, ctx);
    expect(pruned.scope).toBe("PROFILE");
    expect(pruned.works).toBeUndefined();
    expect(pruned.currentHeating).toBeUndefined();
    expect(pruned.dpe).toBeUndefined();
  });

  it("évalue chaque aide pour l'ensemble des travaux qu'elle couvre", () => {
    const e = evaluate(OWNER, DEFAULT_RULESET, REF);
    expect(e.scope).toBe("PROFILE");
    expect(e.selectedWorks).toEqual([]);
    expect(e.outcome).toBe("POTENTIALLY_ELIGIBLE");
    expect(e.headline).toBe(PROFILE_HEADLINES.POTENTIALLY_ELIGIBLE);
    const mpr = e.results.find((r) => r.id === "MPR_GESTE")!;
    expect(mpr.status).toBe("POTENTIALLY_ELIGIBLE");
    expect(mpr.coveredWorks).toEqual(rules.dispositifs.MPR_GESTE.eligibleWorks);
    expect(status(e, "CEE")).toBe("POTENTIALLY_ELIGIBLE");
    expect(status(e, "ECO_PTZ")).toBe("POTENTIALLY_ELIGIBLE");
    // La classe énergétique n'est pas demandée : la rénovation d'ampleur reste à vérifier.
    expect(status(e, "MPR_AMPLEUR")).toBe("NEEDS_REVIEW");
    // La bonification temporaire des chauffe-eau est signalée, sans montant.
    expect(e.results.find((r) => r.id === "CEE")?.highlights?.[0]?.until).toBe("2026-12-31");
  });

  it("applique les vraies conditions : revenus, statut, avancement, ancienneté", () => {
    const rich = evaluate({ ...OWNER, income: "SUPERIEUR" }, DEFAULT_RULESET, REF);
    expect(status(rich, "MPR_GESTE")).toBe("NOT_ELIGIBLE");
    expect(status(rich, "CEE")).toBe("POTENTIALLY_ELIGIBLE");
    expect(rich.outcome).toBe("POTENTIALLY_ELIGIBLE");

    const tenant = evaluate(TENANT, DEFAULT_RULESET, REF);
    expect(status(tenant, "MPR_GESTE")).toBe("NOT_ELIGIBLE");
    expect(status(tenant, "ECO_PTZ")).toBe("NOT_ELIGIBLE");
    expect(status(tenant, "CEE")).toBe("POTENTIALLY_ELIGIBLE");

    const tooLate = evaluate({ ...TENANT, worksStarted: "OUI", quoteSigned: "OUI", quoteSignedRecency: "OLD" }, DEFAULT_RULESET, REF);
    expect(tooLate.outcome).toBe("NOT_ELIGIBLE");

    const brandNew = evaluate({ ...OWNER, construction: { kind: "YEAR", year: 2026 } }, DEFAULT_RULESET, REF);
    expect(brandNew.outcome).toBe("NOT_ELIGIBLE");

    // Maison récente : MaPrimeRénov' seulement par dérogation (chaudière fioul), à vérifier.
    const recent = evaluate({ ...OWNER, construction: { kind: "YEAR", year: 2015 } }, DEFAULT_RULESET, REF);
    const mpr = recent.results.find((r) => r.id === "MPR_GESTE")!;
    expect(mpr.status).toBe("NEEDS_REVIEW");
    expect(mpr.criteria.find((c) => c.id === "anciennete")?.label).toMatch(/dérogation possible/);
    expect(recent.outcome).toBe("POTENTIALLY_ELIGIBLE");
  });

  it("reste hors périmètre en outre-mer", () => {
    const e = evaluate({ ...OWNER, postalCode: "97400", communeInsee: "97411", communeName: "Saint-Denis" }, DEFAULT_RULESET, REF);
    expect(e.outcome).toBe("OUT_OF_SCOPE");
  });
});
