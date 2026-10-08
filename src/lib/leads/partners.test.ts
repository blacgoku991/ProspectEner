import { describe, expect, it } from "vitest";
import type { Answers } from "@/engine/types";
import {
  describeCriteria,
  HYDRAULIC_HEAT_PUMP_PRESET,
  matchPartner,
  type PartnerCriteria,
  parsePartnerCriteria,
  partnerWhere,
  referenceYearOf,
  selectPartnerForRequest,
} from "./partners";
import { leadProfileFromAnswers, requestLeadProfile } from "./profile";

const YEAR = 2026;

/** Demande type du premier partenaire : PAC air/eau, maison chauffée au fioul par radiateurs en fonte. */
const HYDRAULIC: Answers = {
  postalCode: "69003",
  communeInsee: "69383",
  departement: "69",
  housingType: "MAISON",
  householdSize: 3,
  income: "TRES_MODESTE",
  works: ["PAC"],
  heatPumpType: "PAC_AIR_EAU",
  currentHeating: "CHAUDIERE_FIOUL",
  heatEmitters: "RADIATEURS_FONTE",
  radiatorCount: 9,
  heatedArea: 120,
  boilerLocation: "CAVE_SOUS_SOL",
  occupancy: "LOCATAIRE",
  residence: "PRINCIPALE",
  construction: { kind: "PERIOD", from: 1975, to: 2000 },
};

const match = (a: Answers, criteria = HYDRAULIC_HEAT_PUMP_PRESET) => matchPartner(leadProfileFromAnswers(a), criteria, YEAR);

describe("profil de la demande", () => {
  it("recopie les réponses utiles, « je ne sais pas » devenant inconnu", () => {
    const p = leadProfileFromAnswers({ ...HYDRAULIC, heatedArea: "INCONNU", currentHeating: "INCONNU", income: "INCONNU" });
    expect(p).toMatchObject({
      incomeCategory: null,
      householdSize: 3,
      housingType: "MAISON",
      occupancy: "LOCATAIRE",
      currentHeating: null,
      heatEmitters: "RADIATEURS_FONTE",
      radiatorCount: 9,
      heatedArea: null,
      boilerLocation: "CAVE_SOUS_SOL",
      constructionYearMin: 1975,
      constructionYearMax: 2000,
      departement: "69",
      workItems: ["PAC_AIR_EAU"],
    });
  });
});

describe("correspondance avec une entreprise partenaire", () => {
  it("demande conforme : tous les critères remplis (propriétaire ou locataire)", () => {
    const m = match(HYDRAULIC);
    expect(m.status).toBe("MATCH");
    expect(m.checks.every((c) => c.status === "OK")).toBe(true);
  });

  it("un critère contredit suffit à écarter la demande, avec la raison", () => {
    const electric = match({ ...HYDRAULIC, heatEmitters: "RADIATEURS_ELECTRIQUES", currentHeating: "ELECTRIQUE" });
    expect(electric.status).toBe("NO");
    expect(electric.checks.filter((c) => c.status === "KO").map((c) => c.label)).toEqual(["Chauffage actuel", "Diffusion de la chaleur"]);
    expect(match({ ...HYDRAULIC, heatedArea: 79 }).status).toBe("NO");
    expect(match({ ...HYDRAULIC, heatedArea: 80 }).status).toBe("MATCH");
    expect(match({ ...HYDRAULIC, income: "INTERMEDIAIRE" }).status).toBe("NO");
    expect(match({ ...HYDRAULIC, housingType: "APPARTEMENT" }).status).toBe("NO");
    expect(match({ ...HYDRAULIC, works: ["ISOLATION"], insulationItems: ["ISOLATION_MURS"] }).status).toBe("NO");
  });

  it("réponse inconnue : à vérifier, sans écarter la demande", () => {
    expect(match({ ...HYDRAULIC, heatedArea: "INCONNU" }).status).toBe("TO_CHECK");
    expect(match({ ...HYDRAULIC, income: "INCONNU" }).status).toBe("TO_CHECK");
    // « Pompe à chaleur (type à préciser) » peut être une PAC air/eau.
    expect(match({ ...HYDRAULIC, heatPumpType: "PAC_INCONNU" }).status).toBe("TO_CHECK");
    expect(match({ ...HYDRAULIC, heatPumpType: "PAC_AIR_AIR" }).status).toBe("NO");
  });

  it("ancienneté du logement : année ou période d'achèvement", () => {
    const criteria = { ...HYDRAULIC_HEAT_PUMP_PRESET, minBuildingAge: 2 };
    expect(match({ ...HYDRAULIC, construction: { kind: "YEAR", year: 2024 } }, criteria).status).toBe("MATCH");
    expect(match({ ...HYDRAULIC, construction: { kind: "YEAR", year: 2025 } }, criteria).status).toBe("NO");
    expect(match({ ...HYDRAULIC, construction: { kind: "PERIOD", from: 2011, to: null } }, criteria).status).toBe("TO_CHECK");
    expect(match({ ...HYDRAULIC, construction: { kind: "UNKNOWN" } }, criteria).status).toBe("TO_CHECK");
  });

  it("sans critère : toutes les demandes", () => {
    const none = parsePartnerCriteria({});
    expect(match({ postalCode: "69003" }, none).status).toBe("MATCH");
    expect(partnerWhere(none, YEAR)).toEqual({});
    expect(describeCriteria(none)).toEqual(["Toutes les demandes"]);
  });

  it("critères illisibles en base : relus sans erreur, comme « toutes les demandes »", () => {
    expect(parsePartnerCriteria({ works: ["INCONNU_XYZ"] })).toEqual(parsePartnerCriteria({}));
    expect(parsePartnerCriteria(null).works).toEqual([]);
  });

  it("résumé lisible des critères du préréglage « PAC air/eau »", () => {
    expect(describeCriteria(HYDRAULIC_HEAT_PUMP_PRESET)).toEqual([
      "Travaux : Pompe à chaleur air/eau, Chauffe-eau thermodynamique",
      "Revenus : Bleu, Jaune",
      "Logement : Maison",
      "Chauffage actuel : Chaudière au gaz, Chaudière au fioul, Bois",
      "Émetteurs : Radiateurs à eau en fonte, Radiateurs à eau en acier ou en aluminium",
      "Surface chauffée : 80 m² ou plus",
      "Logement de plus de 2 ans",
    ]);
  });

  it("filtre en base : travaux « à préciser » inclus, inconnus acceptés", () => {
    const where = partnerWhere(HYDRAULIC_HEAT_PUMP_PRESET, YEAR);
    expect(where).toMatchObject({
      AND: expect.arrayContaining([
        { workItems: { hasSome: ["PAC_AIR_EAU", "CHAUFFE_EAU_THERMODYNAMIQUE", "PAC_INCONNU", "EAU_CHAUDE_INCONNU"] } },
        { OR: [{ heatedArea: { gte: 80 } }, { heatedArea: null }] },
        { OR: [{ constructionYearMin: null }, { constructionYearMin: { lte: 2024 } }] },
      ]),
    });
  });
});

describe("entreprise nommée dans la demande, avant l'envoi", () => {
  const ISOLATION = parsePartnerCriteria({ works: ["ISOLATION_MURS"] });
  const candidate = (id: string, displayName: string, criteria: PartnerCriteria) => ({ id, displayName, criteria });
  const select = (a: Answers, partners: Parameters<typeof selectPartnerForRequest>[1]) => selectPartnerForRequest(leadProfileFromAnswers(a), partners, YEAR);

  it("aucune entreprise : personne n'est nommé", () => {
    expect(select(HYDRAULIC, [])).toBeNull();
  });

  it("une entreprise dont tous les critères sont remplis est nommée, avec son nom affiché", () => {
    expect(select(HYDRAULIC, [candidate("p1", "Chauffage Lyonnais, Lyon, RGE", HYDRAULIC_HEAT_PUMP_PRESET)])).toEqual({
      id: "p1",
      displayName: "Chauffage Lyonnais, Lyon, RGE",
    });
  });

  it("jamais une entreprise dont un critère n'est pas rempli", () => {
    expect(select(HYDRAULIC, [candidate("iso", "Isolation Sud", ISOLATION)])).toBeNull();
    expect(select({ ...HYDRAULIC, heatedArea: 79 }, [candidate("p1", "Chauffage Lyonnais", HYDRAULIC_HEAT_PUMP_PRESET)])).toBeNull();
  });

  it("une correspondance complète passe avant une correspondance à vérifier, quel que soit l'ordre alphabétique", () => {
    // Surface inconnue : à vérifier pour une entreprise qui exige 80 m², remplie pour une entreprise sans exigence de surface.
    const answers: Answers = { ...HYDRAULIC, heatedArea: "INCONNU" };
    const noArea = { ...HYDRAULIC_HEAT_PUMP_PRESET, minHeatedArea: null };
    const partners = [candidate("a", "Aaa Chauffage", HYDRAULIC_HEAT_PUMP_PRESET), candidate("z", "Zzz Chauffage", noArea)];
    expect(matchPartner(leadProfileFromAnswers(answers), HYDRAULIC_HEAT_PUMP_PRESET, YEAR).status).toBe("TO_CHECK");
    expect(select(answers, partners)?.id).toBe("z");
    expect(select(answers, [...partners].reverse())?.id).toBe("z");
  });

  it("à défaut de correspondance complète, une entreprise à vérifier est nommée", () => {
    const answers: Answers = { ...HYDRAULIC, heatedArea: "INCONNU" };
    expect(select(answers, [candidate("p1", "Chauffage Lyonnais", HYDRAULIC_HEAT_PUMP_PRESET), candidate("iso", "Isolation Sud", ISOLATION)])?.id).toBe("p1");
  });

  it("à égalité, la première par ordre alphabétique (accents compris), indépendamment de l'ordre reçu", () => {
    const partners = [
      candidate("z", "Zénith Chauffage", HYDRAULIC_HEAT_PUMP_PRESET),
      candidate("e2", "Étoile Énergie", HYDRAULIC_HEAT_PUMP_PRESET),
      candidate("f", "Froid et Chaud", HYDRAULIC_HEAT_PUMP_PRESET),
    ];
    // « Étoile » se classe avec les « E », avant « Froid » (et non après « Z » comme en ordre binaire).
    expect(select(HYDRAULIC, partners)?.id).toBe("e2");
    expect(select(HYDRAULIC, [...partners].reverse())?.id).toBe("e2");
  });

  it("ancienneté du logement : appréciée avec l'année de référence fournie", () => {
    const recent: Answers = { ...HYDRAULIC, construction: { kind: "YEAR", year: 2024 } };
    const partners = [candidate("p1", "Chauffage Lyonnais", HYDRAULIC_HEAT_PUMP_PRESET)];
    expect(selectPartnerForRequest(leadProfileFromAnswers(recent), partners, 2026)?.id).toBe("p1");
    expect(selectPartnerForRequest(leadProfileFromAnswers(recent), partners, 2025)).toBeNull();
    expect(referenceYearOf("2026-10-08")).toBe(2026);
  });

  it("département : déduit de la commune comme sur le serveur, même sans réponse « département »", () => {
    const lyonOnly = parsePartnerCriteria({ ...HYDRAULIC_HEAT_PUMP_PRESET, departements: ["69"] });
    const { departement: _d, ...answers } = HYDRAULIC;
    const partners = [candidate("p1", "Chauffage Lyonnais", lyonOnly)];
    // Sans le département, le critère serait « à vérifier » ; déduit de la commune (69383), il est rempli.
    expect(matchPartner(leadProfileFromAnswers(answers), lyonOnly, YEAR).status).toBe("TO_CHECK");
    expect(requestLeadProfile(answers).departement).toBe("69");
    expect(matchPartner(requestLeadProfile(answers), lyonOnly, YEAR).status).toBe("MATCH");
    expect(selectPartnerForRequest(requestLeadProfile({ ...answers, communeInsee: "13055", postalCode: "13001" }), partners, YEAR)).toBeNull();
  });
});
