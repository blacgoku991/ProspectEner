import { describe, expect, it } from "vitest";
import { DEFAULT_RULESET } from "@/engine";
import type { DispositifId, WorkCategory } from "@/engine/types";
import { WORK_CATEGORY_LABELS, WORK_ITEMS } from "@/engine/works";
import {
  AID_GUIDES,
  aidSummary,
  aidsForWork,
  ceeBonuses,
  coupDePouce,
  coupDePouceSentence,
  eligibilityLines,
  frenchList,
  procedureLines,
  WORK_GUIDES,
  workCoverage,
  workGuideBySlug,
  workGuideForItem,
  workItemsOf,
} from "./guides";

const rules = DEFAULT_RULESET.data;

describe("pages d'information générées depuis le barème", () => {
  it("une page par dispositif et par famille de travaux, aux adresses uniques", () => {
    const ids: DispositifId[] = ["MPR_GESTE", "MPR_AMPLEUR", "CEE", "ECO_PTZ"];
    expect(AID_GUIDES.map((g) => g.id).sort()).toEqual([...ids].sort());
    expect(new Set(AID_GUIDES.map((g) => g.slug)).size).toBe(AID_GUIDES.length);
    expect(new Set(WORK_GUIDES.map((g) => g.slug)).size).toBe(WORK_GUIDES.length);
    for (const g of [...AID_GUIDES, ...WORK_GUIDES]) expect(g.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    // Chaque famille de travaux évaluée a exactement une page.
    const categories = (Object.keys(WORK_CATEGORY_LABELS) as WorkCategory[]).filter((c) => c !== "AUTRE");
    for (const c of categories) expect(WORK_GUIDES.filter((g) => g.categories.includes(c)), c).toHaveLength(1);
    for (const item of Object.keys(WORK_ITEMS) as (keyof typeof WORK_ITEMS)[]) {
      if (WORK_ITEMS[item].category !== "AUTRE") expect(workGuideForItem(item), item).not.toBeNull();
    }
  });

  it("n'affiche comme couverts que les travaux listés dans le barème", () => {
    for (const guide of WORK_GUIDES) {
      for (const c of workCoverage(rules, guide)) {
        const eligible = rules.dispositifs[c.id].eligibleWorks.map((w) => WORK_ITEMS[w].label);
        for (const label of c.covered) expect(eligible, `${guide.slug} / ${c.id}`).toContain(label);
      }
    }
    const pac = workCoverage(rules, workGuideBySlug("pompe-a-chaleur")!);
    const mpr = pac.find((c) => c.id === "MPR_GESTE")!;
    expect(mpr.covered).toContain(WORK_ITEMS.PAC_AIR_EAU.label);
    expect(mpr.excluded.map((e) => e.label)).toContain(WORK_ITEMS.PAC_AIR_AIR.label);
    expect(aidsForWork(rules, workGuideBySlug("isolation")!)).not.toContain("MPR_GESTE");
    expect(workItemsOf(workGuideBySlug("chauffe-eau")!)).toEqual(["CHAUFFE_EAU_THERMODYNAMIQUE", "CHAUFFE_EAU_SOLAIRE"]);
  });

  it("décrit les conditions à partir des données du barème", () => {
    const mpr = eligibilityLines(rules, "MPR_GESTE").join(" ");
    expect(mpr).toContain("propriétaires occupants et propriétaires bailleurs");
    expect(mpr).toContain(`au moins ${rules.dispositifs.MPR_GESTE.minAgeYears} ans`);
    expect(mpr).toMatch(/revenus très modestes, revenus modestes et revenus intermédiaires/);
    expect(eligibilityLines(rules, "CEE").join(" ")).toContain("résidence principale ou secondaire");
    const cee = procedureLines(rules, "CEE").join(" ");
    expect(cee).toContain("avant de signer le devis");
    expect(cee).toContain(`${rules.dispositifs.CEE.quoteSignedGraceDays} jours`);
    expect(procedureLines(rules, "MPR_GESTE")[0]).toBe("La demande se fait avant le début des travaux.");
    expect(aidSummary(rules, "MPR_GESTE")).toContain("réservée aux propriétaires");
  });

  it("ne montre une bonification qu'avant sa date de fin, et pour les travaux concernés", () => {
    const [bonus] = rules.dispositifs.CEE.temporaryBonuses;
    expect(bonus).toBeDefined();
    expect(ceeBonuses(rules, "2026-08-15")[0]?.current).toBe(false);
    expect(ceeBonuses(rules, bonus!.engagedFrom)[0]?.current).toBe(true);
    expect(ceeBonuses(rules, bonus!.engagedUntil)).toHaveLength(1);
    expect(ceeBonuses(rules, "2027-01-01")).toHaveLength(0);
    expect(ceeBonuses(rules, bonus!.engagedFrom, ["PAC_AIR_EAU"])).toHaveLength(0);
    expect(ceeBonuses(rules, bonus!.engagedFrom, ["CHAUFFE_EAU_SOLAIRE"])).toHaveLength(1);
  });

  it("rédige le Coup de pouce Chauffage avec les équipements du barème", () => {
    const cdp = coupDePouce(rules, "2026-10-04", workItemsOf(workGuideBySlug("pompe-a-chaleur")!));
    expect(cdp).not.toBeNull();
    const sentence = coupDePouceSentence(cdp!);
    expect(sentence).toContain("une chaudière au fioul, une chaudière au gaz ou une chaudière au charbon");
    expect(sentence).toContain("pompe à chaleur air/eau");
    expect(sentence).toMatch(/^Dans une résidence principale/);
    expect(coupDePouce(rules, "2026-10-04", ["VMC_DOUBLE_FLUX"])).toBeNull();
    expect(coupDePouce(rules, "2031-01-01", ["PAC_AIR_EAU"])).toBeNull();
  });

  it("énumère à la française", () => {
    expect(frenchList(["a"])).toBe("a");
    expect(frenchList(["a", "b", "c"])).toBe("a, b et c");
    expect(frenchList(["a", "b"], "ou")).toBe("a ou b");
  });
});
