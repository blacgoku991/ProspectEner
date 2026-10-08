import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { REFERENCE_SCENARIOS, type Answers } from "@/engine";
import type { Prisma } from "@/generated/prisma/client";
import { buildRequestWhere, parseListFilters, resolvePartnerFilter } from "@/lib/admin/requests";
import { hashEmail } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import {
  HYDRAULIC_HEAT_PUMP_PRESET,
  matchPartner,
  type PartnerCriteria,
  partnerCriteriaSchema,
  partnerWhere,
  parsePartnerCriteria,
} from "@/lib/leads/partners";
import { listPartners } from "@/lib/leads/partners-db";
import { LEAD_PROFILE_SELECT, leadProfileColumns, leadProfileFromAnswers, leadProfileFromRow } from "@/lib/leads/profile";
import { anonymizeRequest } from "@/lib/requests/anonymize";
import { createContactRequest } from "@/lib/requests/create";
import { saveSettings } from "@/lib/settings";
import { ANSWERS_ELIGIBLE, configure, freshIp, resetDatabase, simulationPayload, TEST_SETTINGS } from "./helpers";

const ctx = () => ({ ip: freshIp(), userAgent: "vitest" });
const ADMIN = { id: "00000000-0000-0000-0000-000000000000", role: "ADMIN" as const };

async function create(answers: Record<string, unknown> = {}, contact: Record<string, unknown> = {}) {
  const res = await createContactRequest(await simulationPayload({ answers: { ...ANSWERS_ELIGIBLE, ...answers } }, contact), ctx());
  if (!res.ok) throw new Error(`création impossible : ${res.code}`);
  return prisma.contactRequest.findUniqueOrThrow({ where: { reference: res.reference } });
}

describe("profil de la demande (tri et entreprises partenaires)", () => {
  beforeEach(async () => {
    await resetDatabase();
    await configure();
  });

  it("recopie les réponses utiles dans les colonnes de la demande à sa création", async () => {
    const row = await create();
    expect({
      incomeCategory: row.incomeCategory,
      householdSize: row.householdSize,
      housingType: row.housingType,
      occupancy: row.occupancy,
      currentHeating: row.currentHeating,
      heatEmitters: row.heatEmitters,
      radiatorCount: row.radiatorCount,
      heatedArea: row.heatedArea,
      boilerLocation: row.boilerLocation,
      constructionYearMin: row.constructionYearMin,
      constructionYearMax: row.constructionYearMax,
      departement: row.departement,
      workItems: row.workItems,
    }).toEqual({
      incomeCategory: "MODESTE",
      householdSize: 3,
      housingType: "MAISON",
      occupancy: "PROPRIETAIRE_OCCUPANT",
      currentHeating: "CHAUDIERE_FIOUL",
      heatEmitters: "RADIATEURS_FONTE",
      radiatorCount: 9,
      heatedArea: 120,
      boilerLocation: "GARAGE",
      constructionYearMin: 1985,
      constructionYearMax: 1985,
      departement: "69",
      workItems: ["PAC_AIR_EAU"],
    });
    // Les colonnes reprennent exactement le profil calculé à partir des réponses enregistrées.
    expect(leadProfileFromRow(row)).toEqual(leadProfileFromAnswers(row.answers as unknown as Answers, row.departement));
  });

  it("« Je ne sais pas » et les périodes de construction : colonnes vides ou bornes de la période", async () => {
    const row = await create({
      income: "INCONNU",
      heatEmitters: "INCONNU",
      heatedArea: "INCONNU",
      currentHeating: "CHAUDIERE_GAZ",
      gasBoilerCondensing: "NON",
      boilerLocation: "INCONNU",
      oilTankRemoval: undefined,
      construction: { kind: "PERIOD", from: null, to: 1947 },
      works: ["PAC", "EAU_CHAUDE"],
      hotWaterTarget: "CHAUFFE_EAU_THERMODYNAMIQUE",
    });
    expect(row.incomeCategory).toBeNull();
    expect(row.householdSize).toBe(3);
    expect(row.heatEmitters).toBeNull();
    // Émetteurs inconnus : la question sur les radiateurs n'est pas posée.
    expect(row.radiatorCount).toBeNull();
    expect((row.answers as Record<string, unknown>).radiatorCount).toBeUndefined();
    expect(row.heatedArea).toBeNull();
    expect(row.boilerLocation).toBeNull();
    expect(row.currentHeating).toBe("CHAUDIERE_GAZ");
    expect([row.constructionYearMin, row.constructionYearMax]).toEqual([null, 1947]);
    expect(row.workItems).toEqual(["PAC_AIR_EAU", "CHAUFFE_EAU_THERMODYNAMIQUE"]);
  });

  it("refuse les catégories de revenus non retenues (rose par défaut), puis les accepte une fois ajoutées", async () => {
    const refused = await createContactRequest(await simulationPayload({ answers: { ...ANSWERS_ELIGIBLE, income: "SUPERIEUR" } }), ctx());
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.status).toBe(403);
      expect(refused.code).toBe("INCOME_NOT_ACCEPTED");
    }
    const violet = await createContactRequest(await simulationPayload({ answers: { ...ANSWERS_ELIGIBLE, income: "INTERMEDIAIRE" } }), ctx());
    expect(!violet.ok && violet.code).toBe("INCOME_NOT_ACCEPTED");
    expect(await prisma.contactRequest.count()).toBe(0);

    // Bleu et jaune acceptés par défaut ; « je ne sais pas » toujours accepté (le conseiller vérifie).
    for (const income of ["TRES_MODESTE", "MODESTE", "INCONNU"]) {
      const ok = await createContactRequest(await simulationPayload({ answers: { ...ANSWERS_ELIGIBLE, income } }), ctx());
      expect(ok.ok, income).toBe(true);
    }

    await saveSettings(
      { ...TEST_SETTINGS, contact: { ...TEST_SETTINGS.contact, acceptedIncomeCategories: ["TRES_MODESTE", "MODESTE", "SUPERIEUR"] } },
      null,
    );
    const accepted = await createContactRequest(await simulationPayload({ answers: { ...ANSWERS_ELIGIBLE, income: "SUPERIEUR" } }), ctx());
    expect(accepted.ok).toBe(true);
    if (accepted.ok) {
      expect((await prisma.contactRequest.findUniqueOrThrow({ where: { reference: accepted.reference } })).incomeCategory).toBe("SUPERIEUR");
    }
  });

  it("e-mail facultatif avec un rappel et adresse du logement : enregistrés, puis effacés à l'anonymisation", async () => {
    const row = await create({}, { channel: "PHONE", phone: "06 12 34 56 78", email: " Camille@Example.com ", streetAddress: "  12 rue des Lilas\u0007 " });
    expect(row.channel).toBe("PHONE");
    expect(row.phone).toBe("0612345678");
    expect(row.email).toBe("camille@example.com");
    expect(row.emailHash).toBe(hashEmail("camille@example.com"));
    expect(row.streetAddress).toBe("12 rue des Lilas");

    // Sans e-mail ni adresse : rien n'est enregistré.
    const bare = await create({}, { channel: "PHONE", email: "", streetAddress: "" });
    expect([bare.email, bare.emailHash, bare.streetAddress]).toEqual([null, null, null]);

    await prisma.$transaction((tx) => anonymizeRequest(tx, row.id, null, "test"));
    const anonymized = await prisma.contactRequest.findUniqueOrThrow({ where: { id: row.id } });
    expect([anonymized.firstName, anonymized.lastName, anonymized.phone, anonymized.email, anonymized.streetAddress]).toEqual([null, null, null, null, null]);
    expect(anonymized.anonymizedAt).not.toBeNull();
  });

  it("valide l'e-mail facultatif et l'adresse côté serveur", async () => {
    const res = await createContactRequest(
      await simulationPayload({}, { channel: "PHONE", email: "pas-une-adresse", streetAddress: "x".repeat(201) }),
      ctx(),
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.status).toBe(422);
    expect(Object.keys(res.fieldErrors ?? {})).toEqual(expect.arrayContaining(["contact.email", "contact.streetAddress"]));
    expect(await prisma.contactRequest.count()).toBe(0);
  });
});

// ─── Critères des entreprises : filtre en base équivalent au calcul de correspondance ───────────

/** Générateur pseudo-aléatoire déterministe (mulberry32) : jeu de demandes reproductible. */
function prng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REFERENCE_YEAR = 2026;

const VALUES = {
  incomeCategory: [null, "TRES_MODESTE", "MODESTE", "INTERMEDIAIRE", "SUPERIEUR"],
  householdSize: [null, 1, 4],
  housingType: [null, "MAISON", "APPARTEMENT"],
  occupancy: [null, "PROPRIETAIRE_OCCUPANT", "PROPRIETAIRE_BAILLEUR", "LOCATAIRE", "AUTRE"],
  currentHeating: [null, "CHAUDIERE_GAZ", "CHAUDIERE_FIOUL", "BOIS", "ELECTRIQUE", "PAC"],
  heatEmitters: [null, "RADIATEURS_FONTE", "RADIATEURS_ACIER_ALU", "PLANCHER_CHAUFFANT_EAU", "RADIATEURS_ELECTRIQUES", "POELE_CHEMINEE"],
  radiatorCount: [null, 6],
  heatedArea: [null, 45, 79, 80, 81, 100, 150],
  boilerLocation: [null, "GARAGE", "CUISINE"],
  // [min, max] : seuils d'ancienneté autour de 2 ans (2024) et 15 ans (2011) en 2026.
  construction: [
    [null, null],
    [null, 1947],
    [1948, 1974],
    [1975, 2000],
    [2001, 2010],
    [2011, null],
    [2010, 2010],
    [2011, 2011],
    [2024, 2024],
    [2025, 2025],
    [2026, 2026],
  ],
  departement: [null, "69", "75", "2A", "971"],
  workItems: [
    [],
    ["PAC_AIR_EAU"],
    ["PAC_INCONNU"],
    ["PAC_AIR_AIR"],
    ["CHAUFFE_EAU_THERMODYNAMIQUE"],
    ["EAU_CHAUDE_INCONNU"],
    ["ISOLATION_MURS", "PAC_AIR_EAU"],
    ["ISOLATION_INCONNU"],
    ["ISOLATION_COMBLES_TOITURE", "MENUISERIES"],
    ["CHAUDIERE_BIOMASSE", "DEPOSE_CUVE_FIOUL"],
    ["CHAUFFAGE_INCONNU"],
    ["RENOVATION_GLOBALE"],
    ["AUTRE_PROJET"],
  ],
} as const;

type RowProfile = Omit<Prisma.ContactRequestCreateInput, "reference" | "idempotencyKey" | "payloadHash" | "kind" | "channel" | "territory" | "answers" | "overallOutcome" | "requestSentence" | "noticeText" | "acquisitionOrigin">;

type InsertedRequest = Awaited<ReturnType<typeof insertRequest>>;

async function noticeId(): Promise<string> {
  const t = await prisma.textVersion.create({ data: { kind: "CONTACT_NOTICE", hash: randomUUID(), content: "Notice de test." } });
  return t.id;
}

async function insertRequest(noticeTextId: string, i: number, data: RowProfile & { answers?: Prisma.InputJsonValue }) {
  return prisma.contactRequest.create({
    data: {
      reference: `PE-TEST-${String(i).padStart(4, "0")}`,
      idempotencyKey: randomUUID(),
      payloadHash: "test",
      kind: "SIMULATION",
      channel: "EMAIL",
      email: `test${i}@example.invalid`,
      territory: "METRO",
      answers: {},
      overallOutcome: "POTENTIALLY_ELIGIBLE",
      requestSentence: "Demande de test.",
      noticeText: { connect: { id: noticeTextId } },
      acquisitionOrigin: "DIRECT",
      ...data,
    },
    select: { id: true, ...LEAD_PROFILE_SELECT },
  });
}

function randomProfile(rand: () => number): RowProfile {
  const pick = <T,>(values: readonly T[]): T => values[Math.floor(rand() * values.length)]!;
  const [constructionYearMin, constructionYearMax] = pick(VALUES.construction);
  return {
    incomeCategory: pick(VALUES.incomeCategory),
    householdSize: pick(VALUES.householdSize),
    housingType: pick(VALUES.housingType),
    occupancy: pick(VALUES.occupancy),
    currentHeating: pick(VALUES.currentHeating),
    heatEmitters: pick(VALUES.heatEmitters),
    radiatorCount: pick(VALUES.radiatorCount),
    heatedArea: pick(VALUES.heatedArea),
    boilerLocation: pick(VALUES.boilerLocation),
    constructionYearMin,
    constructionYearMax,
    departement: pick(VALUES.departement),
    workItems: [...pick(VALUES.workItems)],
  };
}

function randomCriteria(rand: () => number): PartnerCriteria {
  const subset = <T,>(values: readonly T[]): T[] => (rand() < 0.5 ? [] : values.filter(() => rand() < 0.4));
  return partnerCriteriaSchema.parse({
    works: subset(["PAC_AIR_EAU", "PAC_GEOTHERMIQUE", "PAC_HYBRIDE", "CHAUFFE_EAU_THERMODYNAMIQUE", "ISOLATION_MURS", "MENUISERIES", "CHAUDIERE_BIOMASSE", "VMC_DOUBLE_FLUX"]),
    incomeCategories: subset(["TRES_MODESTE", "MODESTE", "INTERMEDIAIRE", "SUPERIEUR"]),
    housingTypes: subset(["MAISON", "APPARTEMENT"]),
    occupancies: subset(["PROPRIETAIRE_OCCUPANT", "PROPRIETAIRE_BAILLEUR", "LOCATAIRE", "AUTRE"]),
    currentHeating: subset(["CHAUDIERE_GAZ", "CHAUDIERE_FIOUL", "BOIS", "ELECTRIQUE", "PAC"]),
    heatEmitters: subset(["RADIATEURS_FONTE", "RADIATEURS_ACIER_ALU", "PLANCHER_CHAUFFANT_EAU", "RADIATEURS_ELECTRIQUES"]),
    minHeatedArea: [null, 80, 100][Math.floor(rand() * 3)],
    minBuildingAge: [null, 2, 15, 30][Math.floor(rand() * 4)],
    departements: [[], ["69"], ["2A", "75"]][Math.floor(rand() * 3)],
  });
}

describe("critères des entreprises partenaires : filtre en base", () => {
  beforeEach(async () => {
    await resetDatabase();
    await configure();
  });

  it("partnerWhere sélectionne exactement les demandes que matchPartner ne rejette pas", async () => {
    const notice = await noticeId();
    const rand = prng(20261008);
    const rows: InsertedRequest[] = [];
    // Demandes qui remplissent tous les critères du modèle « pompe à chaleur air/eau », puis un jeu varié.
    rows.push(
      await insertRequest(notice, 0, {
        incomeCategory: "MODESTE",
        housingType: "MAISON",
        currentHeating: "CHAUDIERE_FIOUL",
        heatEmitters: "RADIATEURS_FONTE",
        heatedArea: 120,
        constructionYearMin: 1985,
        constructionYearMax: 1985,
        workItems: ["PAC_AIR_EAU"],
      }),
      await insertRequest(notice, 1, {
        incomeCategory: "TRES_MODESTE",
        housingType: "MAISON",
        currentHeating: "CHAUDIERE_GAZ",
        heatEmitters: "RADIATEURS_ACIER_ALU",
        heatedArea: 80,
        constructionYearMin: 2024,
        constructionYearMax: 2024,
        workItems: ["CHAUFFE_EAU_THERMODYNAMIQUE"],
      }),
    );
    for (let i = 2; i < 260; i++) rows.push(await insertRequest(notice, i, randomProfile(rand)));

    const named: [string, PartnerCriteria][] = [
      ["modèle pompe à chaleur air/eau", HYDRAULIC_HEAT_PUMP_PRESET],
      ["aucun critère", partnerCriteriaSchema.parse({})],
      ["surface minimale", partnerCriteriaSchema.parse({ minHeatedArea: 80 })],
      ["ancienneté de 2 ans", partnerCriteriaSchema.parse({ minBuildingAge: 2 })],
      ["ancienneté de 15 ans", partnerCriteriaSchema.parse({ minBuildingAge: 15 })],
      ["isolation (type à préciser accepté)", partnerCriteriaSchema.parse({ works: ["ISOLATION_MURS"] })],
      ["travaux et départements", partnerCriteriaSchema.parse({ works: ["PAC_AIR_EAU"], departements: ["69", "2A"] })],
      ["locataires en appartement, revenus supérieurs", partnerCriteriaSchema.parse({ incomeCategories: ["SUPERIEUR"], housingTypes: ["APPARTEMENT"], occupancies: ["LOCATAIRE"] })],
      ["chauffage et émetteurs", partnerCriteriaSchema.parse({ currentHeating: ["ELECTRIQUE"], heatEmitters: ["PLANCHER_CHAUFFANT_EAU"] })],
    ];
    const criteriaRand = prng(42);
    const random: [string, PartnerCriteria][] = Array.from({ length: 25 }, (_, i) => [`aléatoire n° ${i + 1}`, randomCriteria(criteriaRand)]);

    for (const [label, criteria] of [...named, ...random]) {
      const expected = rows
        .filter((r) => matchPartner(leadProfileFromRow(r), criteria, REFERENCE_YEAR).status !== "NO")
        .map((r) => r.id)
        .sort();
      const actual = (await prisma.contactRequest.findMany({ where: partnerWhere(criteria, REFERENCE_YEAR), select: { id: true } })).map((r) => r.id).sort();
      expect(actual, label).toEqual(expected);
    }

    // Le jeu de données couvre les trois issues pour le modèle (sinon l'équivalence ne prouverait rien).
    const statuses = rows.map((r) => matchPartner(leadProfileFromRow(r), HYDRAULIC_HEAT_PUMP_PRESET, REFERENCE_YEAR).status);
    expect(statuses.filter((s) => s === "MATCH").length).toBeGreaterThanOrEqual(2);
    expect(statuses.filter((s) => s === "TO_CHECK").length).toBeGreaterThan(0);
    expect(statuses.filter((s) => s === "NO").length).toBeGreaterThan(0);
    expect(await prisma.contactRequest.count({ where: partnerWhere(partnerCriteriaSchema.parse({}), REFERENCE_YEAR) })).toBe(rows.length);
  });

  it("filtre « partenaire » de la liste : entreprise active seulement, demandes anonymisées écartées", async () => {
    const [active, inactive] = await Promise.all([
      prisma.partner.create({ data: { name: "Chauffage Actif", details: "Lyon, RGE", criteria: HYDRAULIC_HEAT_PUMP_PRESET } }),
      prisma.partner.create({ data: { name: "Ancienne Entreprise", active: false, criteria: {} } }),
    ]);
    const match = await create();
    const toCheck = await create({ heatedArea: "INCONNU" });
    const no = await create({ currentHeating: "ELECTRIQUE", heatEmitters: "RADIATEURS_ELECTRIQUES", boilerLocation: undefined, oilTankRemoval: undefined });
    const anonymized = await create();
    await prisma.$transaction((tx) => anonymizeRequest(tx, anonymized.id, null, "test"));

    const status = async (id: string) => {
      const row = await prisma.contactRequest.findUniqueOrThrow({ where: { id }, select: LEAD_PROFILE_SELECT });
      return matchPartner(leadProfileFromRow(row), HYDRAULIC_HEAT_PUMP_PRESET, REFERENCE_YEAR).status;
    };
    expect([await status(match.id), await status(toCheck.id), await status(no.id)]).toEqual(["MATCH", "TO_CHECK", "NO"]);

    const activePartners = await listPartners({ activeOnly: true });
    expect(activePartners.map((p) => p.name)).toEqual(["Chauffage Actif"]);

    const resolved = await resolvePartnerFilter(parseListFilters({ partenaire: active.id }), activePartners);
    expect(resolved.partner?.id).toBe(active.id);
    expect(resolved.filters.partenaire).toBe(active.id);
    const ids = (await prisma.contactRequest.findMany({ where: buildRequestWhere(resolved.filters, ADMIN, TEST_SETTINGS, new Date(), resolved.partner?.criteria), select: { id: true } }))
      .map((r) => r.id)
      .sort();
    expect(ids).toEqual([match.id, toCheck.id].sort());

    // Entreprise désactivée ou inconnue, identifiant invalide : filtre retiré (pagination et export ne le reprennent pas).
    for (const value of [inactive.id, randomUUID(), "pas-un-identifiant"]) {
      const r = await resolvePartnerFilter(parseListFilters({ partenaire: value }));
      expect(r.partner, value).toBeNull();
      expect(r.filters.partenaire, value).toBeUndefined();
    }
    expect(await prisma.contactRequest.count({ where: buildRequestWhere(parseListFilters({}), ADMIN, TEST_SETTINGS) })).toBe(4);
  });

  it("filtre « revenus » : catégorie précise ou réponse inconnue", async () => {
    await saveSettings({ ...TEST_SETTINGS, contact: { ...TEST_SETTINGS.contact, acceptedIncomeCategories: ["TRES_MODESTE", "MODESTE", "INTERMEDIAIRE", "SUPERIEUR"] } }, null);
    const bleu = await create({ income: "TRES_MODESTE" });
    const jaune = await create({ income: "MODESTE" });
    const inconnu = await create({ income: "INCONNU" });
    const ids = async (revenus: string) =>
      (await prisma.contactRequest.findMany({ where: buildRequestWhere(parseListFilters({ revenus }), ADMIN, TEST_SETTINGS), select: { id: true } })).map((r) => r.id);
    expect(await ids("TRES_MODESTE")).toEqual([bleu.id]);
    expect(await ids("MODESTE")).toEqual([jaune.id]);
    expect(await ids("INCONNU")).toEqual([inconnu.id]);
    expect(await ids("SUPERIEUR")).toEqual([]);
  });
});

// ─── Migration du 8 octobre 2026 : reprise des demandes et de la liste des partenaires ─────────

const MIGRATION_SQL = readFileSync(
  path.resolve(import.meta.dirname, "../../prisma/migrations/20261008120000_lead_profile_partners/migration.sql"),
  "utf8",
);

function migrationStatement(re: RegExp): string {
  const m = re.exec(MIGRATION_SQL);
  if (!m) throw new Error(`Instruction introuvable dans la migration : ${re}`);
  return m[0];
}

const BACKFILL_SQL = migrationStatement(/UPDATE "ContactRequest" SET[\s\S]*?WHERE jsonb_typeof\("answers"\) = 'object';/);
const PARTNERS_SQL = migrationStatement(/INSERT INTO "Partner"[\s\S]*?ON CONFLICT \("name"\) DO NOTHING;/);

describe("migration du profil des demandes et des entreprises partenaires", () => {
  beforeEach(async () => {
    await resetDatabase();
    await configure();
  });

  it("recalcule le profil des demandes existantes comme à la création", async () => {
    const notice = await noticeId();
    const samples: Answers[] = [
      ...REFERENCE_SCENARIOS.map((s) => s.answers),
      { ...ANSWERS_ELIGIBLE, works: ["PAC"], heatPumpType: undefined, oilTankRemoval: "OUI" },
      { ...ANSWERS_ELIGIBLE, works: ["ISOLATION", "VENTILATION"], insulationItems: ["ISOLATION_MURS", "MENUISERIES"], ventilationTarget: undefined },
      { ...ANSWERS_ELIGIBLE, works: ["ISOLATION", "AUTRE", "RENOVATION_GLOBALE"], insulationItems: [] },
      { ...ANSWERS_ELIGIBLE, works: ["CHAUFFAGE", "EAU_CHAUDE"], heatingTarget: "CHAUDIERE_BIOMASSE", hotWaterTarget: undefined, oilTankRemoval: "OUI" },
      { ...ANSWERS_ELIGIBLE, works: ["EAU_CHAUDE"], hotWaterTarget: "CHAUFFE_EAU_SOLAIRE", oilTankRemoval: "OUI" },
      { ...ANSWERS_ELIGIBLE, income: "INCONNU", currentHeating: "INCONNU", construction: { kind: "UNKNOWN" } },
      { ...ANSWERS_ELIGIBLE, construction: { kind: "PERIOD", from: 2011, to: null }, housingType: "APPARTEMENT", occupancy: "LOCATAIRE" },
      { postalCode: "75011", communeInsee: "75111", communeName: "Paris 11e Arrondissement", works: ["ISOLATION", "PAC"] },
      {},
    ];
    const rows: InsertedRequest[] = [];
    for (const [i, answers] of samples.entries()) {
      rows.push(await insertRequest(notice, i, { answers: JSON.parse(JSON.stringify(answers)) as Prisma.InputJsonValue, departement: "69" }));
    }
    await prisma.$executeRawUnsafe(BACKFILL_SQL);

    const after = await prisma.contactRequest.findMany({ where: { id: { in: rows.map((r) => r.id) } }, select: { id: true, ...LEAD_PROFILE_SELECT } });
    for (const [i, answers] of samples.entries()) {
      const row = after.find((r) => r.id === rows[i]!.id)!;
      const expected = leadProfileColumns(leadProfileFromAnswers(answers, "69"));
      const label = `exemple n° ${i} : ${JSON.stringify(answers.works ?? [])}`;
      expect(
        {
          incomeCategory: row.incomeCategory,
          householdSize: row.householdSize,
          housingType: row.housingType,
          occupancy: row.occupancy,
          currentHeating: row.currentHeating,
          constructionYearMin: row.constructionYearMin,
          constructionYearMax: row.constructionYearMax,
          workItems: [...row.workItems].sort(),
        },
        label,
      ).toEqual({
        incomeCategory: expected.incomeCategory,
        householdSize: expected.householdSize,
        housingType: expected.housingType,
        occupancy: expected.occupancy,
        currentHeating: expected.currentHeating,
        constructionYearMin: expected.constructionYearMin,
        constructionYearMax: expected.constructionYearMax,
        workItems: [...expected.workItems].sort(),
      });
      // Questions apparues avec la migration : jamais posées aux demandes existantes.
      expect([row.heatEmitters, row.radiatorCount, row.heatedArea, row.boilerLocation], label).toEqual([null, null, null, null]);
    }
  });

  it("reprend la liste libre des partenaires des paramètres, une entreprise par ligne, sans doublon", async () => {
    await prisma.partner.create({ data: { name: "Isolation Existante", details: "Déjà créée", criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    // Saisie d'une zone de texte : les navigateurs envoient des fins de ligne CRLF.
    const partners = "Chauffage Test, Lyon, RGE\r\n\r\n  Isolation Existante  \r\nChauffage Test, Lyon, RGE\nVentilation Sud\n";
    await prisma.siteSettings.update({
      where: { id: 1 },
      data: { data: { ...TEST_SETTINGS, activity: { ...TEST_SETTINGS.activity, partners } } as unknown as Prisma.InputJsonValue },
    });
    await prisma.$executeRawUnsafe(PARTNERS_SQL);
    await prisma.$executeRawUnsafe(PARTNERS_SQL);

    const rows = await prisma.partner.findMany({ orderBy: { name: "asc" } });
    expect(rows.map((p) => p.name)).toEqual(["Chauffage Test, Lyon, RGE", "Isolation Existante", "Ventilation Sud"]);
    const existing = rows.find((p) => p.name === "Isolation Existante")!;
    expect(existing.details).toBe("Déjà créée");
    expect(parsePartnerCriteria(existing.criteria)).toEqual(HYDRAULIC_HEAT_PUMP_PRESET);
    // Entreprises reprises : actives, sans critère (toutes les demandes).
    for (const p of rows.filter((r) => r.name !== "Isolation Existante")) {
      expect(p.active).toBe(true);
      expect(parsePartnerCriteria(p.criteria)).toEqual(partnerCriteriaSchema.parse({}));
    }
  });
});
