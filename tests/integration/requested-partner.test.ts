import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_RULESET, pruneAnswers, type Answers } from "@/engine";
import { buildRequestWhere, parseListFilters, resolvePartnerFilter } from "@/lib/admin/requests";
import { prisma } from "@/lib/db";
import { HYDRAULIC_HEAT_PUMP_PRESET, referenceYearOf, selectPartnerForRequest } from "@/lib/leads/partners";
import { listPartners } from "@/lib/leads/partners-db";
import { requestLeadProfile } from "@/lib/leads/profile";
import { buildRequestSentence } from "@/lib/legal/texts";
import { toPublicConfig } from "@/lib/public-config";
import { createContactRequest } from "@/lib/requests/create";
import { getSettings, saveSettings } from "@/lib/settings";
import type { SiteSettings } from "@/lib/settings-schema";
import { ANSWERS_ELIGIBLE, configure, freshIp, resetDatabase, simulationPayload, TEST_SETTINGS } from "./helpers";

const ctx = () => ({ ip: freshIp(), userAgent: "vitest" });
const ADMIN = { id: "00000000-0000-0000-0000-000000000000", role: "ADMIN" as const };

/** Mise en relation déclarée : l'entreprise partenaire peut être nommée dans la demande. */
const REFERRAL_SETTINGS: SiteSettings = { ...TEST_SETTINGS, activity: { ...TEST_SETTINGS.activity, kinds: ["MISE_EN_RELATION"] } };

const PARTNER = { name: "Chauffage Lyonnais", details: "Lyon, RGE", displayName: "Chauffage Lyonnais, Lyon, RGE" };
// Formulation de la phrase : voir src/lib/legal/texts.test.ts ; ici, seule compte l'entreprise nommée.
const SENTENCE_WITH_PARTNER = buildRequestSentence("Entreprise Test", "PHONE", "pompe à chaleur air/eau", PARTNER.displayName);
const SENTENCE_WITHOUT_PARTNER = buildRequestSentence("Entreprise Test", "PHONE", "pompe à chaleur air/eau");

/**
 * Ce que fait le navigateur : configuration publique (entreprises actives), réponses élaguées comme
 * dans le simulateur, profil et choix de l'entreprise avec l'année de la date de la simulation.
 */
async function browserPartner(answers: Answers, referenceDate: string) {
  const settings = await getSettings();
  const config = toPublicConfig(settings, await listPartners({ activeOnly: true }));
  const pruned = pruneAnswers(answers, { rules: DEFAULT_RULESET.data, referenceDate });
  return selectPartnerForRequest(requestLeadProfile(pruned), config.partners, referenceYearOf(referenceDate));
}

/** Demande envoyée comme par le navigateur : l'entreprise affichée (identifiant et nom) accompagne la demande. */
async function submit(answers: Answers = ANSWERS_ELIGIBLE, contact: Record<string, unknown> = {}) {
  const payload = await simulationPayload({ answers }, contact);
  const partner = await browserPartner(answers, payload.referenceDate);
  const res = await createContactRequest({ ...payload, partnerId: partner?.id ?? null, partnerName: partner?.displayName ?? null }, ctx());
  if (!res.ok) throw new Error(`création impossible : ${res.code}`);
  return { res, partner, row: await prisma.contactRequest.findUniqueOrThrow({ where: { reference: res.reference }, include: { events: true } }) };
}

describe("entreprise partenaire nommée dans la demande", () => {
  beforeEach(async () => {
    await resetDatabase();
    await configure(REFERRAL_SETTINGS);
  });

  it("configuration publique : entreprises actives seulement, réduites à l'identifiant, au nom affiché et aux critères", async () => {
    await prisma.partner.create({ data: { name: PARTNER.name, details: PARTNER.details, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    await prisma.partner.create({ data: { name: "Ancienne Entreprise", active: false, criteria: {} } });
    const partners = await listPartners();
    const config = toPublicConfig(await getSettings(), partners);
    expect(config.partners).toHaveLength(1);
    expect(Object.keys(config.partners[0]!).sort()).toEqual(["criteria", "displayName", "id"]);
    expect(config.partners[0]).toMatchObject({ displayName: PARTNER.displayName, criteria: HYDRAULIC_HEAT_PUMP_PRESET });
    // Mise en relation non déclarée : aucune entreprise transmise au navigateur.
    expect(toPublicConfig(TEST_SETTINGS, partners).partners).toEqual([]);
  });

  it("le modèle « pompe à chaleur air/eau » correspond : la phrase nomme l'entreprise, enregistrée avec la demande", async () => {
    const partner = await prisma.partner.create({ data: { name: PARTNER.name, details: PARTNER.details, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    // Une entreprise qui ne correspond pas n'est jamais nommée.
    await prisma.partner.create({ data: { name: "Aaa Isolation", criteria: { works: ["ISOLATION_MURS"] } } });
    const { res, row } = await submit();
    expect(res.partnerName).toBe(PARTNER.displayName);
    expect(res.requestSentence).toBe(SENTENCE_WITH_PARTNER);
    expect(row.requestSentence).toBe(SENTENCE_WITH_PARTNER);
    expect(row.requestedPartnerId).toBe(partner.id);
    expect(row.requestedPartnerName).toBe(PARTNER.displayName);
    expect(row.requestedPartnerSentAt).toBeNull();
    // Historique : nom de l'entreprise seulement, aucune coordonnée.
    expect(row.events.map((e) => [e.type, (e.data as { partner?: string }).partner])).toEqual([["CREATED", PARTNER.displayName]]);

    // Double envoi : même demande, même entreprise.
    const payload = await simulationPayload();
    const body = { ...payload, partnerId: partner.id, partnerName: PARTNER.displayName };
    const first = await createContactRequest(body, ctx());
    const replay = await createContactRequest(body, ctx());
    expect(first.ok && replay.ok && replay.replay).toBe(true);
    if (first.ok && replay.ok) {
      expect(replay.reference).toBe(first.reference);
      expect(replay.partnerName).toBe(PARTNER.displayName);
    }
  });

  it("refuse l'envoi si l'entreprise affichée n'est plus la bonne (PARTNER_CHANGED)", async () => {
    const partner = await prisma.partner.create({ data: { name: PARTNER.name, details: PARTNER.details, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const payload = await simulationPayload();
    // Aucune entreprise affichée, une entreprise inconnue, ou la bonne sous un autre nom.
    const shown: { partnerId?: string | null; partnerName?: string | null }[] = [
      {},
      { partnerId: null, partnerName: null },
      { partnerId: randomUUID(), partnerName: PARTNER.displayName },
      { partnerId: partner.id, partnerName: "Chauffage Lyonnais, Lyon" },
    ];
    for (const s of shown) {
      const res = await createContactRequest({ ...payload, idempotencyKey: randomUUID(), ...s }, ctx());
      const partnerId = JSON.stringify(s);
      expect(res.ok, String(partnerId)).toBe(false);
      if (res.ok) continue;
      expect(res.status).toBe(409);
      expect(res.code).toBe("PARTNER_CHANGED");
      expect(res.message).toBe("Les informations sur l'entreprise partenaire ont été mises à jour : merci de relire votre demande avant de l'envoyer.");
    }
    // Entreprise désactivée entre l'affichage et l'envoi : la phrase lue ne correspond plus.
    await prisma.partner.update({ where: { id: partner.id }, data: { active: false } });
    const stale = await createContactRequest({ ...payload, idempotencyKey: randomUUID(), partnerId: partner.id, partnerName: PARTNER.displayName }, ctx());
    expect(!stale.ok && stale.code).toBe("PARTNER_CHANGED");
    expect(await prisma.contactRequest.count()).toBe(0);
    // Après rechargement de la configuration : plus d'entreprise nommée, l'envoi aboutit.
    const { row } = await submit();
    expect(row.requestedPartnerId).toBeNull();
    expect(row.requestSentence).toBe(SENTENCE_WITHOUT_PARTNER);
  });

  it("correspondance complète avant correspondance à vérifier, puis ordre alphabétique : même choix dans le navigateur et sur le serveur", async () => {
    // Surface inconnue : « à vérifier » pour le modèle (80 m² minimum), complète pour une entreprise sans exigence de surface.
    await prisma.partner.create({ data: { name: "Aaa Chauffage", criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const noArea = await prisma.partner.create({ data: { name: "Zzz Chauffage", criteria: { ...HYDRAULIC_HEAT_PUMP_PRESET, minHeatedArea: null } } });
    const unknownArea = { ...ANSWERS_ELIGIBLE, heatedArea: "INCONNU" } as Answers;
    const { row, partner } = await submit(unknownArea);
    expect(partner?.id).toBe(noArea.id);
    expect(row.requestedPartnerId).toBe(noArea.id);
    // Surface connue : les deux correspondent, la première par ordre alphabétique est nommée.
    const both = await submit();
    expect(both.row.requestedPartnerName).toBe("Aaa Chauffage");
  });

  it("département déduit de la commune, comme sur le serveur, pour une entreprise limitée à certains départements", async () => {
    const lyon = await prisma.partner.create({ data: { name: "Chauffage du Rhône", criteria: { ...HYDRAULIC_HEAT_PUMP_PRESET, departements: ["69"] } } });
    // Les réponses du simulateur ne contiennent pas le département : il est déduit du code INSEE de la commune.
    expect((ANSWERS_ELIGIBLE as { departement?: string }).departement).toBeUndefined();
    const { row } = await submit();
    expect(row.departement).toBe("69");
    expect(row.requestedPartnerId).toBe(lyon.id);
    const marseille = await submit({ ...ANSWERS_ELIGIBLE, postalCode: "13001", communeInsee: "13201", communeName: "Marseille 1er Arrondissement" });
    expect(marseille.row.requestedPartnerId).toBeNull();
  });

  it("aucune entreprise ne correspond : aucune entreprise nommée", async () => {
    await prisma.partner.create({ data: { name: PARTNER.name, details: PARTNER.details, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const { res, row, partner } = await submit({ ...ANSWERS_ELIGIBLE, heatedArea: 79 });
    expect(partner).toBeNull();
    expect(res.partnerName).toBeNull();
    expect(row.requestedPartnerId).toBeNull();
    expect(row.requestedPartnerName).toBeNull();
    expect(row.requestSentence).toBe(SENTENCE_WITHOUT_PARTNER);
  });

  it("mise en relation non déclarée : aucune entreprise nommée, et un identifiant envoyé est refusé", async () => {
    const partner = await prisma.partner.create({ data: { name: PARTNER.name, details: PARTNER.details, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    await saveSettings(TEST_SETTINGS, null);
    const { row, partner: shown } = await submit();
    expect(shown).toBeNull();
    expect(row.requestedPartnerId).toBeNull();
    expect(row.requestSentence).toBe(SENTENCE_WITHOUT_PARTNER);
    const forged = await createContactRequest({ ...(await simulationPayload()), partnerId: partner.id, partnerName: PARTNER.displayName }, ctx());
    expect(!forged.ok && forged.code).toBe("PARTNER_CHANGED");
  });

  it("rappel rapide (sans test) : jamais d'entreprise nommée", async () => {
    const partner = await prisma.partner.create({ data: { name: "Toutes Demandes", criteria: {} } });
    await saveSettings({ ...REFERRAL_SETTINGS, contact: { ...REFERRAL_SETTINGS.contact, quickCallbackEnabled: true } }, null);
    const base = await simulationPayload();
    const quick = {
      kind: "QUICK_CALLBACK",
      idempotencyKey: randomUUID(),
      answers: { postalCode: "69003", communeInsee: "69383", communeName: "Lyon 3e Arrondissement", works: ["PAC"] },
      contact: base.contact,
      noticeHash: base.noticeHash,
      formElapsedMs: 9000,
    };
    const forged = await createContactRequest({ ...quick, partnerId: partner.id, partnerName: "Toutes Demandes" }, ctx());
    expect(!forged.ok && forged.code).toBe("PARTNER_CHANGED");
    const res = await createContactRequest({ ...quick, idempotencyKey: randomUUID(), partnerId: null }, ctx());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const row = await prisma.contactRequest.findUniqueOrThrow({ where: { reference: res.reference } });
    expect(row.requestedPartnerId).toBeNull();
    expect(row.requestSentence).not.toContain("Toutes Demandes");
  });

  it("critères illisibles en base : l'entreprise n'est jamais nommée ni proposée au navigateur, ni retenue par le filtre", async () => {
    // Valeur inconnue (travaux retirés du moteur, saisie manuelle) : lue « fermée », jamais « toutes les demandes ».
    const broken = await prisma.partner.create({ data: { name: "Aaa Critères Anciens", criteria: { works: ["TRAVAUX_SUPPRIMES"] } } });
    const valid = await prisma.partner.create({ data: { name: PARTNER.name, details: PARTNER.details, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const listed = (await listPartners()).find((p) => p.id === broken.id)!;
    expect(listed.criteria.needsReview).toBe(true);
    expect(listed.criteria.works).toEqual([]);
    const config = toPublicConfig(await getSettings(), await listPartners({ activeOnly: true }));
    expect(config.partners.map((p) => p.id)).toEqual([valid.id]);
    const { row } = await submit();
    expect(row.requestedPartnerId).toBe(valid.id);
    // Le filtre « partenaire » de la liste n'en retient aucune demande.
    const { filters, partner } = await resolvePartnerFilter(parseListFilters({ partenaire: broken.id }));
    expect(await prisma.contactRequest.count({ where: buildRequestWhere(filters, ADMIN, REFERRAL_SETTINGS, new Date(), partner?.criteria) })).toBe(0);
    // Seule entreprise active, aux critères illisibles : aucune entreprise nommée.
    await prisma.partner.update({ where: { id: valid.id }, data: { active: false } });
    expect((await submit()).row.requestedPartnerId).toBeNull();
  });

  it("filtre de la liste : demandes qui nomment l'entreprise, ou correspondant à ses critères", async () => {
    const partner = await prisma.partner.create({ data: { name: PARTNER.name, details: PARTNER.details, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const named = await submit();
    const notNamed = await submit({ ...ANSWERS_ELIGIBLE, heatedArea: 79 });
    // Critères modifiés après la demande : elle nomme toujours l'entreprise et reste dans sa liste.
    await prisma.partner.update({ where: { id: partner.id }, data: { criteria: { works: ["ISOLATION_MURS"] } } });
    const ids = async (sp: Record<string, string>) => {
      const { filters, partner: p } = await resolvePartnerFilter(parseListFilters(sp));
      return (await prisma.contactRequest.findMany({ where: buildRequestWhere(filters, ADMIN, REFERRAL_SETTINGS, new Date(), p?.criteria), select: { id: true } })).map((r) => r.id);
    };
    expect(await ids({ partenaire: partner.id, nommee: "1" })).toEqual([named.row.id]);
    expect(await ids({ partenaire: partner.id })).toEqual([named.row.id]);
    // Sans entreprise, l'option est ignorée.
    expect((await ids({ nommee: "1" })).sort()).toEqual([named.row.id, notNamed.row.id].sort());
  });
});
