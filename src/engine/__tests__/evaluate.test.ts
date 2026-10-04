import { describe, expect, it } from "vitest";
import { evaluate } from "../evaluate";
import { DEFAULT_RULESET } from "../index";
import type { RuleSet } from "../ruleset-schema";
import type { Answers, DispositifId, DispositifResult, Evaluation } from "../types";
import { ELIGIBLE_PAC, INCOMPLETE, NOT_ELIGIBLE, OUTRE_MER, REF } from "./fixtures";

const byId = (e: Evaluation, id: DispositifId): DispositifResult => {
  const r = e.results.find((x) => x.id === id);
  if (!r) throw new Error(`Résultat ${id} absent`);
  return r;
};

const clone = <T,>(v: T): T => structuredClone(v);

describe("evaluate — scénarios de référence", () => {
  it("cas potentiellement éligible : PAC air/eau remplaçant une chaudière fioul", () => {
    const e = evaluate(ELIGIBLE_PAC, DEFAULT_RULESET, REF);
    expect(e.territory).toBe("METRO");
    expect(e.incomeZone).toBe("HORS_IDF");
    expect(e.outcome).toBe("POTENTIALLY_ELIGIBLE");
    expect(e.headline).toMatch(/pourrait correspondre/);
    expect(byId(e, "MPR_GESTE").status).toBe("POTENTIALLY_ELIGIBLE");
    expect(byId(e, "CEE").status).toBe("POTENTIALLY_ELIGIBLE");
    expect(byId(e, "ECO_PTZ").status).toBe("POTENTIALLY_ELIGIBLE");
    // La rénovation d'ampleur ne concerne pas un projet de PAC seule.
    expect(byId(e, "MPR_AMPLEUR").status).toBe("NOT_CONCERNED");
    // Bonification Coup de pouce signalée, sans montant.
    expect(byId(e, "CEE").notes.join(" ")).toMatch(/Coup de pouce/);
    expect(JSON.stringify(e)).not.toMatch(/\d\s?€/);
    // Les conditions restant à vérifier sont toujours présentes.
    expect(byId(e, "MPR_GESTE").remainingConditions.length).toBeGreaterThan(0);
    expect(byId(e, "MPR_GESTE").remainingConditions.join(" ")).toMatch(/RGE/);
  });

  it("cas ne remplissant pas les critères : locataire, résidence secondaire, devis signé de longue date", () => {
    const e = evaluate(NOT_ELIGIBLE, DEFAULT_RULESET, REF);
    expect(e.outcome).toBe("NOT_ELIGIBLE");
    expect(e.headline).toMatch(/ne semblent pas remplis/);
    const mpr = byId(e, "MPR_GESTE");
    expect(mpr.status).toBe("NOT_ELIGIBLE");
    expect(mpr.criteria.find((c) => c.id === "statut")?.status).toBe("NOT_MET");
    const cee = byId(e, "CEE");
    expect(cee.status).toBe("NOT_ELIGIBLE");
    expect(cee.criteria.find((c) => c.id === "devis_non_signe")?.status).toBe("NOT_MET");
    expect(byId(e, "ECO_PTZ").status).toBe("NOT_ELIGIBLE");
  });

  it("cas incomplet : réponses « je ne sais pas » → vérification nécessaire", () => {
    const e = evaluate(INCOMPLETE, DEFAULT_RULESET, REF);
    expect(e.territory).toBe("IDF");
    expect(e.outcome).toBe("NEEDS_REVIEW");
    expect(e.headline).toMatch(/doivent être vérifiées/);
    const mpr = byId(e, "MPR_GESTE");
    expect(mpr.status).toBe("NEEDS_REVIEW");
    expect(mpr.criteria.find((c) => c.id === "anciennete")?.status).toBe("UNKNOWN");
    expect(mpr.criteria.find((c) => c.id === "revenus")?.status).toBe("UNKNOWN");
    expect(mpr.criteria.find((c) => c.id === "travaux")?.status).toBe("UNKNOWN");
  });

  it("territoire hors périmètre : outre-mer", () => {
    const e = evaluate(OUTRE_MER, DEFAULT_RULESET, REF);
    expect(e.territory).toBe("DROM");
    expect(e.outcome).toBe("OUT_OF_SCOPE");
    expect(e.headline).toMatch(/hors du périmètre/);
    expect(e.notices.join(" ")).toMatch(/outre-mer/);
  });

  it("territoire hors périmètre : Monaco et code postal inconnu", () => {
    expect(evaluate({ postalCode: "98000" }, DEFAULT_RULESET, REF).territory).toBe("HORS_FRANCE");
    expect(evaluate({ postalCode: "98000" }, DEFAULT_RULESET, REF).outcome).toBe("OUT_OF_SCOPE");
    expect(evaluate({ postalCode: "00000" }, DEFAULT_RULESET, REF).outcome).toBe("OUT_OF_SCOPE");
  });

  it("projet hors périmètre : « autre projet » uniquement", () => {
    const e = evaluate({ ...ELIGIBLE_PAC, works: ["AUTRE"] }, DEFAULT_RULESET, REF);
    expect(e.outcome).toBe("OUT_OF_SCOPE");
    expect(e.results.every((r) => r.status === "NOT_CONCERNED")).toBe(true);
  });

  it("n'affiche jamais « éligible » quand un critère bloquant n'est pas rempli", () => {
    const answers: Answers = { ...ELIGIBLE_PAC, worksStarted: "OUI" };
    const e = evaluate(answers, DEFAULT_RULESET, REF);
    expect(byId(e, "CEE").status).toBe("NOT_ELIGIBLE");
    // MaPrimeRénov' : exception « panne » documentée → vérification nécessaire, pas « éligible ».
    expect(byId(e, "MPR_GESTE").status).toBe("NEEDS_REVIEW");
  });

  it("est déterministe", () => {
    const a = evaluate(ELIGIBLE_PAC, DEFAULT_RULESET, REF);
    const b = evaluate(clone(ELIGIBLE_PAC), clone(DEFAULT_RULESET), REF);
    expect(a).toEqual(b);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });
});

describe("evaluate — règles spécifiques", () => {
  it("MaPrimeRénov' par geste n'est pas ouvert aux revenus supérieurs", () => {
    const e = evaluate({ ...ELIGIBLE_PAC, income: "SUPERIEUR" }, DEFAULT_RULESET, REF);
    expect(byId(e, "MPR_GESTE").status).toBe("NOT_ELIGIBLE");
    // Les primes CEE n'ont pas de condition de ressources.
    expect(byId(e, "CEE").status).toBe("POTENTIALLY_ELIGIBLE");
  });

  it("l'isolation n'est plus finançable par MaPrimeRénov' par geste, mais reste évaluée pour les CEE", () => {
    const answers: Answers = { ...ELIGIBLE_PAC, works: ["ISOLATION"], insulationItems: ["ISOLATION_COMBLES_TOITURE"] };
    const e = evaluate(answers, DEFAULT_RULESET, REF);
    const mpr = byId(e, "MPR_GESTE");
    expect(mpr.status).toBe("NOT_ELIGIBLE");
    expect(mpr.criteria.find((c) => c.id === "travaux")?.detail).toMatch(/1er septembre 2026/);
    expect(byId(e, "CEE").status).toBe("POTENTIALLY_ELIGIBLE");
  });

  it("dérogation fioul : logement de 6 ans éligible à MaPrimeRénov' par geste si une chaudière fioul est remplacée", () => {
    const fioul = evaluate({ ...ELIGIBLE_PAC, construction: { kind: "YEAR", year: 2020 } }, DEFAULT_RULESET, REF);
    expect(byId(fioul, "MPR_GESTE").status).toBe("POTENTIALLY_ELIGIBLE");
    expect(byId(fioul, "MPR_GESTE").criteria.find((c) => c.id === "anciennete")?.label).toMatch(/dérogation/);

    const gaz = evaluate(
      { ...ELIGIBLE_PAC, construction: { kind: "YEAR", year: 2020 }, currentHeating: "CHAUDIERE_GAZ" },
      DEFAULT_RULESET,
      REF,
    );
    expect(byId(gaz, "MPR_GESTE").status).toBe("NOT_ELIGIBLE");
  });

  it("devis signé : délai de grâce CEE de 14 jours", () => {
    const recent = evaluate({ ...ELIGIBLE_PAC, quoteSigned: "OUI", quoteSignedRecency: "RECENT" }, DEFAULT_RULESET, REF);
    expect(byId(recent, "CEE").status).toBe("NEEDS_REVIEW");
    const old = evaluate({ ...ELIGIBLE_PAC, quoteSigned: "OUI", quoteSignedRecency: "OLD" }, DEFAULT_RULESET, REF);
    expect(byId(old, "CEE").status).toBe("NOT_ELIGIBLE");
    const unknown = evaluate({ ...ELIGIBLE_PAC, quoteSigned: "OUI", quoteSignedRecency: "INCONNU" }, DEFAULT_RULESET, REF);
    expect(byId(unknown, "CEE").status).toBe("NEEDS_REVIEW");
    // MaPrimeRénov' par geste : la signature préalable du devis n'est pas un critère bloquant.
    expect(byId(old, "MPR_GESTE").status).toBe("POTENTIALLY_ELIGIBLE");
  });

  it("entreprise non RGE : vérification nécessaire (et non éligibilité affirmée)", () => {
    const e = evaluate({ ...ELIGIBLE_PAC, contractor: "NON_RGE" }, DEFAULT_RULESET, REF);
    expect(byId(e, "MPR_GESTE").status).toBe("NEEDS_REVIEW");
    expect(byId(e, "CEE").status).toBe("NEEDS_REVIEW");
  });

  it("aide déjà obtenue pour les mêmes travaux : vérification nécessaire", () => {
    const e = evaluate({ ...ELIGIBLE_PAC, priorAidStatus: "OUI", priorAids: ["MAPRIMERENOV"] }, DEFAULT_RULESET, REF);
    expect(byId(e, "MPR_GESTE").status).toBe("NEEDS_REVIEW");
    expect(byId(e, "CEE").status).toBe("POTENTIALLY_ELIGIBLE");
  });

  it("rénovation d'ampleur : classe DPE E/F/G requise", () => {
    const base: Answers = { ...ELIGIBLE_PAC, works: ["RENOVATION_GLOBALE"], heatPumpType: undefined };
    expect(byId(evaluate({ ...base, dpe: "F" }, DEFAULT_RULESET, REF), "MPR_AMPLEUR").status).toBe("POTENTIALLY_ELIGIBLE");
    expect(byId(evaluate({ ...base, dpe: "D" }, DEFAULT_RULESET, REF), "MPR_AMPLEUR").status).toBe("NOT_ELIGIBLE");
    expect(byId(evaluate({ ...base, dpe: "INCONNU" }, DEFAULT_RULESET, REF), "MPR_AMPLEUR").status).toBe("NEEDS_REVIEW");
    // Toutes catégories de revenus depuis le 23 février 2026.
    expect(byId(evaluate({ ...base, dpe: "G", income: "SUPERIEUR" }, DEFAULT_RULESET, REF), "MPR_AMPLEUR").status).toBe(
      "POTENTIALLY_ELIGIBLE",
    );
  });

  it("locataire : primes CEE possibles, pas MaPrimeRénov' ni éco-PTZ", () => {
    const e = evaluate({ ...ELIGIBLE_PAC, occupancy: "LOCATAIRE", income: undefined, householdSize: undefined }, DEFAULT_RULESET, REF);
    expect(byId(e, "MPR_GESTE").status).toBe("NOT_ELIGIBLE");
    expect(byId(e, "ECO_PTZ").status).toBe("NOT_ELIGIBLE");
    expect(byId(e, "CEE").status).toBe("POTENTIALLY_ELIGIBLE");
    expect(e.outcome).toBe("POTENTIALLY_ELIGIBLE");
  });

  it("travaux dont la prise en charge n'est pas confirmée → à vérifier", () => {
    const e = evaluate({ ...ELIGIBLE_PAC, heatPumpType: "PAC_HYBRIDE" }, DEFAULT_RULESET, REF);
    expect(byId(e, "MPR_GESTE").status).toBe("NEEDS_REVIEW");
    expect(byId(e, "CEE").status).toBe("NEEDS_REVIEW");
  });
});

describe("evaluate — validité et vérification des règles", () => {
  it("barème expiré : conclusion désactivée", () => {
    const e = evaluate(ELIGIBLE_PAC, DEFAULT_RULESET, "2027-01-15");
    for (const r of e.results.filter((x) => x.status !== "NOT_CONCERNED")) {
      expect(r.status).toBe("NEEDS_REVIEW");
      expect(r.conclusionDisabledReason).toMatch(/validité/);
    }
    expect(e.outcome).toBe("NEEDS_REVIEW");
  });

  it("le dernier jour de validité, les règles s'appliquent encore", () => {
    const e = evaluate(ELIGIBLE_PAC, DEFAULT_RULESET, "2026-12-31");
    expect(byId(e, "MPR_GESTE").status).toBe("POTENTIALLY_ELIGIBLE");
  });

  it("règle non vérifiable : aucune conclusion", () => {
    const rs: RuleSet = clone(DEFAULT_RULESET);
    rs.data.dispositifs.MPR_GESTE.verification.status = "UNVERIFIED";
    const e = evaluate(ELIGIBLE_PAC, rs, REF);
    expect(byId(e, "MPR_GESTE").status).toBe("NEEDS_REVIEW");
    expect(byId(e, "MPR_GESTE").conclusionDisabledReason).toMatch(/n'ont pas pu être vérifiées/);
    // Même un cas « non rempli » n'est pas conclu quand la règle est invérifiable.
    const e2 = evaluate({ ...ELIGIBLE_PAC, occupancy: "LOCATAIRE" }, rs, REF);
    expect(byId(e2, "MPR_GESTE").status).toBe("NEEDS_REVIEW");
  });

  it("guichet suspendu : pas de résultat favorable", () => {
    const rs: RuleSet = clone(DEFAULT_RULESET);
    rs.data.dispositifs.MPR_GESTE.availability = "SUSPENDED";
    rs.data.dispositifs.MPR_GESTE.availabilityNote = "Dépôt suspendu.";
    const e = evaluate(ELIGIBLE_PAC, rs, REF);
    expect(byId(e, "MPR_GESTE").status).toBe("NEEDS_REVIEW");
    expect(byId(e, "MPR_GESTE").summary).toBe("Dépôt suspendu.");
  });

  it("dispositif désactivé : absent du résultat", () => {
    const rs: RuleSet = clone(DEFAULT_RULESET);
    rs.data.dispositifs.ECO_PTZ.enabled = false;
    const e = evaluate(ELIGIBLE_PAC, rs, REF);
    expect(e.results.map((r) => r.id)).not.toContain("ECO_PTZ");
  });

  it("chaque résultat cite ses sources, sa date de vérification et sa période de validité", () => {
    const e = evaluate(ELIGIBLE_PAC, DEFAULT_RULESET, REF);
    for (const r of e.results) {
      expect(r.sources.length).toBeGreaterThan(0);
      r.sources.forEach((s) => expect(s.url).toMatch(/^https:\/\/[a-z.-]*gouv\.fr\//));
      expect(r.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.validFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(e.ruleSetVersion).toBe(DEFAULT_RULESET.version);
    expect(e.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("distingue subventions, primes et prêts", () => {
    const e = evaluate(ELIGIBLE_PAC, DEFAULT_RULESET, REF);
    expect(byId(e, "MPR_GESTE").aidKind).toBe("SUBVENTION");
    expect(byId(e, "CEE").aidKind).toBe("PRIME");
    expect(byId(e, "ECO_PTZ").aidKind).toBe("PRET");
    expect(byId(e, "CEE").provider).not.toMatch(/^État$/);
  });
});
