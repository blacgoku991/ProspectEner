import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createContactRequest } from "@/lib/requests/create";
import { hashPhone } from "@/lib/crypto";
import { saveSettings } from "@/lib/settings";
import { ANSWERS_ELIGIBLE, configure, freshIp, resetDatabase, simulationPayload, TEST_SETTINGS } from "./helpers";

const ctx = () => ({ ip: freshIp(), userAgent: "vitest" });

describe("création d'une demande de contact", () => {
  beforeEach(async () => {
    await resetDatabase();
    await configure();
  });

  it("enregistre la demande, le résultat, la preuve et l'échéance de rappel", async () => {
    const res = await createContactRequest(await simulationPayload(), ctx());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.status).toBe(201);
    expect(res.reference).toMatch(/^PE-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(res.cancelToken.length).toBeGreaterThan(20);

    const row = await prisma.contactRequest.findUniqueOrThrow({ where: { reference: res.reference }, include: { noticeText: true, events: true, notifications: true } });
    expect(row.status).toBe("NOUVEAU");
    expect(row.phone).toBe("0612345678");
    expect(row.email).toBeNull();
    expect(row.phoneHash).toBe(hashPhone("0612345678"));
    expect(row.overallOutcome).toBe("POTENTIALLY_ELIGIBLE");
    expect(row.engineVersion).toBe("1.0.0");
    expect(row.ruleSetVersion).toBe("2026.10-1");
    expect(row.territory).toBe("METRO");
    expect(row.departement).toBe("69");
    expect(row.requestSentence).toBe(
      "Je demande à être contacté(e) par Entreprise Test, par téléphone, au sujet de mon projet de pompe à chaleur air/eau.",
    );
    expect(row.noticeText.content).toContain("Responsable du traitement : Entreprise Test");
    expect(row.callbackDeadline).not.toBeNull();
    expect(row.cancelTokenHash).not.toBeNull();
    expect(row.ipHash).toMatch(/^[a-f0-9]{32}$/);
    expect(row.events.map((e) => e.type)).toEqual(["CREATED"]);
    expect(row.notifications.map((n) => n.channel).sort()).toEqual(["EMAIL", "WEBHOOK"]);
    expect(row.acquisitionOrigin).toBe("DIRECT");
  });

  it("double-clic : deux envois simultanés de la même demande ne créent qu'une fiche", async () => {
    const payload = await simulationPayload();
    const [a, b] = await Promise.all([createContactRequest(payload, ctx()), createContactRequest(payload, ctx())]);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.reference).toBe(b.reference);
    expect(a.cancelToken).toBe(b.cancelToken);
    expect([a.replay, b.replay].sort()).toEqual([false, true]);
    expect(await prisma.contactRequest.count()).toBe(1);
    // Renvoi ultérieur (réseau instable) : même référence, toujours une seule fiche.
    const c = await createContactRequest(payload, ctx());
    expect(c.ok && c.status).toBe(200);
    expect(await prisma.contactRequest.count()).toBe(1);
  });

  it("refuse la réutilisation d'une clé d'idempotence avec un autre contenu", async () => {
    const payload = await simulationPayload();
    await createContactRequest(payload, ctx());
    const res = await createContactRequest({ ...payload, contact: { ...payload.contact, firstName: "Autre" } }, ctx());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("valide les champs côté serveur", async () => {
    const res = await createContactRequest(await simulationPayload({}, { phone: "0899123456", firstName: "<script>" }), ctx());
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.status).toBe(422);
    expect(Object.keys(res.fieldErrors ?? {})).toEqual(expect.arrayContaining(["contact.phone", "contact.firstName"]));
  });

  it("exige la confirmation explicite de la demande (case non pré-cochée)", async () => {
    const res = await createContactRequest(await simulationPayload({}, { confirmRequest: false }), ctx());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.["contact.confirmRequest"]).toBeDefined();
  });

  it("refuse les champs inconnus (injection de données)", async () => {
    const payload = await simulationPayload();
    const res = await createContactRequest({ ...payload, answers: { ...payload.answers, isAdmin: true } }, ctx());
    expect(res.ok).toBe(false);
  });

  it("bloque les envois automatisés (champ piège, envoi trop rapide)", async () => {
    const honeypot = await createContactRequest(await simulationPayload({ website: "http://spam" }), ctx());
    expect(!honeypot.ok && honeypot.code).toBe("REJECTED");
    const fast = await createContactRequest(await simulationPayload({ formElapsedMs: 500 }), ctx());
    expect(!fast.ok && fast.code).toBe("TOO_FAST");
    expect(await prisma.contactRequest.count()).toBe(0);
  });

  it("limite le nombre de demandes par connexion", async () => {
    const ip = "198.51.100.7";
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await createContactRequest(await simulationPayload(), { ip, userAgent: "vitest" }));
    expect(results.slice(0, 5).every((r) => r.ok)).toBe(true);
    expect(!results[5]!.ok && results[5]!.status).toBe(429);
  });

  it("refuse si la notice d'information affichée n'est plus celle en vigueur", async () => {
    const payload = await simulationPayload();
    await saveSettings({ ...TEST_SETTINGS, retention: { ...TEST_SETTINGS.retention, requestMonths: 24 } }, null);
    const res = await createContactRequest(payload, ctx());
    expect(!res.ok && res.code).toBe("NOTICE_CHANGED");
  });

  it("réévalue avec la version de règles affichée et refuse une version inconnue ou une simulation périmée", async () => {
    const unknown = await createContactRequest(await simulationPayload({ ruleSetVersion: "1999.01-1" }), ctx());
    expect(!unknown.ok && unknown.code).toBe("RULESET_CHANGED");
    const stale = await createContactRequest(await simulationPayload({ referenceDate: "2026-01-02" }), ctx());
    expect(!stale.ok && stale.code).toBe("STALE_EVALUATION");
  });

  it("refuse un questionnaire incomplet", async () => {
    const { income: _i, ...answers } = ANSWERS_ELIGIBLE;
    const res = await createContactRequest(await simulationPayload({ answers }), ctx());
    expect(!res.ok && res.code).toBe("INCOMPLETE_ANSWERS");
  });

  it("ne conserve que les réponses utiles (minimisation)", async () => {
    const answers = { ...ANSWERS_ELIGIBLE, occupancy: "LOCATAIRE" };
    const res = await createContactRequest(await simulationPayload({ answers }), ctx());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const row = await prisma.contactRequest.findUniqueOrThrow({ where: { reference: res.reference } });
    const stored = row.answers as Record<string, unknown>;
    expect(stored.income).toBeUndefined();
    expect(stored.householdSize).toBeUndefined();
    expect(stored.occupancy).toBe("LOCATAIRE");
  });

  it("ne conserve que la coordonnée du canal choisi", async () => {
    const res = await createContactRequest(await simulationPayload({}, { channel: "EMAIL", email: "Camille@Example.com", phone: "0612345678" }), ctx());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const row = await prisma.contactRequest.findUniqueOrThrow({ where: { reference: res.reference } });
    expect(row.email).toBe("camille@example.com");
    expect(row.phone).toBeNull();
    expect(row.callbackDeadline).toBeNull();
  });

  it("refuse un canal non ouvert et un formulaire fermé (identité non renseignée)", async () => {
    await saveSettings({ ...TEST_SETTINGS, contact: { ...TEST_SETTINGS.contact, phoneCallbackEnabled: false } }, null);
    const phone = await createContactRequest(await simulationPayload(), ctx());
    expect(!phone.ok && phone.code).toBe("CHANNEL_UNAVAILABLE");
    // Rappel activé sans confirmation de l'avertissement juridique : canal toujours fermé.
    await saveSettings({ ...TEST_SETTINGS, contact: { ...TEST_SETTINGS.contact, phoneCallbackReviewedAt: null } }, null);
    const unreviewed = await createContactRequest(await simulationPayload(), ctx());
    expect(!unreviewed.ok && unreviewed.code).toBe("CHANNEL_UNAVAILABLE");
    await saveSettings({ ...TEST_SETTINGS, company: { ...TEST_SETTINGS.company, name: "" } }, null);
    const closed = await createContactRequest(await simulationPayload(), ctx());
    expect(!closed.ok && closed.status).toBe(503);
  });

  it("enregistre une demande de rappel rapide sans résultat d'éligibilité", async () => {
    const base = await simulationPayload();
    const res = await createContactRequest(
      {
        kind: "QUICK_CALLBACK",
        idempotencyKey: base.idempotencyKey,
        answers: { postalCode: "75011", communeInsee: "75111", communeName: "Paris 11e Arrondissement", works: ["ISOLATION", "PAC"] },
        contact: base.contact,
        noticeHash: base.noticeHash,
        formElapsedMs: 9000,
      },
      ctx(),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const row = await prisma.contactRequest.findUniqueOrThrow({ where: { reference: res.reference } });
    expect(row.kind).toBe("QUICK_CALLBACK");
    expect(row.overallOutcome).toBe("NOT_EVALUATED");
    expect(row.evaluation).toBeNull();
    expect(row.territory).toBe("IDF");
    expect(row.requestSentence).toContain("isolation et pompe à chaleur");
  });

  it("classe la source d'acquisition sans accepter de donnée personnelle", async () => {
    await prisma.acquisitionChannel.create({ data: { campaign: "ads-renov-2026", label: "Annonces", source: "google", medium: "cpc" } });
    const ok = await createContactRequest(await simulationPayload({ acquisition: { utmSource: "google", utmMedium: "cpc", utmCampaign: "ads-renov-2026" } }), ctx());
    expect(ok.ok).toBe(true);
    if (ok.ok) expect((await prisma.contactRequest.findUniqueOrThrow({ where: { reference: ok.reference } })).acquisitionOrigin).toBe("AUTHORIZED_CAMPAIGN");
    const unknown = await createContactRequest(await simulationPayload({ acquisition: { utmCampaign: "inconnue" } }), ctx());
    if (unknown.ok) expect((await prisma.contactRequest.findUniqueOrThrow({ where: { reference: unknown.reference } })).acquisitionOrigin).toBe("UNLISTED_CAMPAIGN");
    const pii = await createContactRequest(await simulationPayload({ acquisition: { utmCampaign: "jean@exemple.fr" } }), ctx());
    expect(pii.ok).toBe(false);
  });

  it("signale une demande émanant d'un contact présent dans la liste d'opposition", async () => {
    await prisma.opposition.create({ data: { phoneHash: hashPhone("0612345678"), maskedValue: "06 •• •• •• 78", source: "STAFF" } });
    const res = await createContactRequest(await simulationPayload(), ctx());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const row = await prisma.contactRequest.findUniqueOrThrow({ where: { reference: res.reference } });
    expect(row.oppositionMatch).toBe(true);
    expect(row.status).toBe("A_VERIFIER");
  });
});
