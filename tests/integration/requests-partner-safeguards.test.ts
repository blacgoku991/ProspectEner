import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RULESET, pruneAnswers, type Answers, type Evaluation } from "@/engine";
import { qualificationGroups } from "@/lib/admin/qualification";
import { prisma } from "@/lib/db";
import { HYDRAULIC_HEAT_PUMP_PRESET, referenceYearOf, selectPartnerForRequest } from "@/lib/leads/partners";
import { listPartners } from "@/lib/leads/partners-db";
import { requestLeadProfile } from "@/lib/leads/profile";
import { REQUESTED_PARTNER_SENT_EVENT } from "@/lib/leads/requested-partner";
import { dispatchPendingNotifications } from "@/lib/notifications/dispatch";
import { type EmailMessage, setNotificationTransportForTests, type WebhookMessage } from "@/lib/notifications/transports";
import { toPublicConfig } from "@/lib/public-config";
import { anonymizeRequest } from "@/lib/requests/anonymize";
import { cancelContactRequest, PARTNER_TO_INFORM_EVENT } from "@/lib/requests/cancel";
import { createContactRequest } from "@/lib/requests/create";
import { getSettings, saveSettings } from "@/lib/settings";
import type { SiteSettings } from "@/lib/settings-schema";
import { ANSWERS_ELIGIBLE, configure, freshIp, resetDatabase, simulationPayload, TEST_SETTINGS } from "./helpers";

// Actions serveur de la fiche d'une demande, appelées hors de Next.js : session et contexte de requête simulés.
const staff = vi.hoisted(() => ({ ctx: null as unknown }));
vi.mock("@/lib/auth/guards", () => ({
  requireStaff: async () => staff.ctx,
  requireAdmin: async () => staff.ctx,
  getAccessibleRequestId: async (_ctx: unknown, id: string) => id,
}));
vi.mock("@/lib/request-context", () => ({ requestContext: async () => ({ ip: null, userAgent: null, origin: null }) }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const {
  anonymizeAction,
  bookAppointmentAction,
  logContactAction,
  markPartnerInformedAction,
  recordHandoffAction,
  recordOppositionAction,
} = await import("@/app/admin/(panel)/demandes/[id]/actions");

const ctx = () => ({ ip: freshIp(), userAgent: "vitest" });
const REFERRAL_SETTINGS: SiteSettings = { ...TEST_SETTINGS, activity: { ...TEST_SETTINGS.activity, kinds: ["MISE_EN_RELATION"] } };
const PARTNER = { name: "Chauffage Lyonnais", details: "Lyon, RGE", displayName: "Chauffage Lyonnais, Lyon, RGE" };

/** Ce que fait le navigateur : entreprise choisie dans la configuration publique avec les réponses élaguées. */
async function browserPartner(answers: Answers, referenceDate: string) {
  const config = toPublicConfig(await getSettings(), await listPartners({ activeOnly: true }));
  const pruned = pruneAnswers(answers, { rules: DEFAULT_RULESET.data, referenceDate });
  return selectPartnerForRequest(requestLeadProfile(pruned), config.partners, referenceYearOf(referenceDate));
}

/** Demande envoyée comme par le navigateur : identifiant et nom affiché de l'entreprise nommée. */
async function submit(contact: Record<string, unknown> = {}, answers: Answers = ANSWERS_ELIGIBLE) {
  const payload = await simulationPayload({ answers }, contact);
  const partner = await browserPartner(answers, payload.referenceDate);
  const res = await createContactRequest({ ...payload, partnerId: partner?.id ?? null, partnerName: partner?.displayName ?? null }, ctx());
  if (!res.ok) throw new Error(`création impossible : ${res.code}`);
  return res;
}

async function signIn() {
  const user = await prisma.staffUser.create({ data: { email: "conseiller@test.invalid", displayName: "Conseiller Test", role: "ADMIN" } });
  staff.ctx = { user, session: {}, settings: await getSettings() };
  return user;
}

/** Demande transmise à l'entreprise qu'elle nomme (comme l'export « demandes à transmettre ») : date et historique. */
async function markSent(requestId: string, partner: string) {
  const now = new Date();
  await prisma.contactRequest.update({ where: { id: requestId }, data: { requestedPartnerSentAt: now } });
  await prisma.requestEvent.create({ data: { requestId, type: REQUESTED_PARTNER_SENT_EVENT, data: { partner }, createdAt: now } });
}

const form = (entries: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) for (const value of Array.isArray(v) ? v : [v]) f.append(k, value);
  return f;
};

/** Date et heure (heure de Paris) dans deux jours, au format du champ datetime-local. */
function inTwoDays(): string {
  const d = new Date(Date.now() + 2 * 24 * 3600_000);
  const p = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }).format(d);
  return p.replace(" ", "T");
}

/** Formulaire de rendez-vous complet : tous les critères de la première aide confirmés. */
async function appointmentForm(requestId: string, extra: Record<string, string> = {}) {
  const row = await prisma.contactRequest.findUniqueOrThrow({ where: { id: requestId }, select: { evaluation: true } });
  const groups = qualificationGroups(row.evaluation as unknown as Evaluation);
  return form({ id: requestId, checked: groups[0]!.items.map((i) => i.key), appointmentAt: inTwoDays(), mode: "DOMICILE", ...extra });
}

describe("entreprise nommée : le nom affiché fait partie de la demande", () => {
  beforeEach(async () => {
    await resetDatabase();
    await configure(REFERRAL_SETTINGS);
  });

  it("phrase neutre sur le rôle de l'entreprise, enregistrée telle que lue", async () => {
    await prisma.partner.create({ data: { name: PARTNER.name, details: PARTNER.details, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const res = await submit();
    expect(res.partnerName).toBe(PARTNER.displayName);
    expect(res.requestSentence).toBe(
      "Je demande à être contacté(e) par Entreprise Test et par l'entreprise partenaire Chauffage Lyonnais, Lyon, RGE, par téléphone, au sujet de mon projet de pompe à chaleur air/eau.",
    );
  });

  it("refuse l'envoi si le nom affiché n'est plus celui de l'entreprise (même identifiant), ou s'il manque", async () => {
    const partner = await prisma.partner.create({ data: { name: PARTNER.name, details: PARTNER.details, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const payload = await simulationPayload();
    // Précisions modifiées dans l'administration pendant que la personne lisait la phrase.
    await prisma.partner.update({ where: { id: partner.id }, data: { details: "Villeurbanne, RGE" } });
    const changed = await createContactRequest({ ...payload, partnerId: partner.id, partnerName: PARTNER.displayName }, ctx());
    expect(!changed.ok && changed.status).toBe(409);
    expect(!changed.ok && changed.code).toBe("PARTNER_CHANGED");
    const missing = await createContactRequest({ ...payload, partnerId: partner.id }, ctx());
    expect(!missing.ok && missing.code).toBe("INVALID_PAYLOAD");
    if (!missing.ok) expect(missing.fieldErrors?.partnerName).toBeDefined();
    // Nom affiché sans entreprise nommée par le serveur : refusé aussi.
    await prisma.partner.update({ where: { id: partner.id }, data: { active: false } });
    const ghost = await createContactRequest({ ...payload, partnerId: null, partnerName: PARTNER.displayName }, ctx());
    expect(!ghost.ok && ghost.code).toBe("PARTNER_CHANGED");
    expect(await prisma.contactRequest.count()).toBe(0);
  });

  it("le nom affiché entre dans l'empreinte de la demande (idempotence)", async () => {
    await prisma.partner.create({ data: { name: PARTNER.name, details: PARTNER.details, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const payload = await simulationPayload();
    const partner = await browserPartner(ANSWERS_ELIGIBLE, payload.referenceDate);
    const body = { ...payload, partnerId: partner!.id, partnerName: partner!.displayName };
    const first = await createContactRequest(body, ctx());
    expect(first.ok).toBe(true);
    const again = await createContactRequest(body, ctx());
    expect(again.ok && again.replay).toBe(true);
    const other = await createContactRequest({ ...body, partnerName: "Autre Entreprise" }, ctx());
    expect(!other.ok && other.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("un renvoi après la perte de la réponse retrouve la demande, même si les paramètres ont changé depuis", async () => {
    const payload = await simulationPayload();
    const first = await createContactRequest(payload, ctx());
    expect(first.ok).toBe(true);
    await saveSettings(
      { ...REFERRAL_SETTINGS, contact: { ...REFERRAL_SETTINGS.contact, acceptedIncomeCategories: ["TRES_MODESTE"], phoneCallbackEnabled: false } },
      null,
    );
    const retry = await createContactRequest(payload, ctx());
    expect(retry.ok && retry.replay).toBe(true);
    if (first.ok && retry.ok) expect(retry.reference).toBe(first.reference);
    // Une nouvelle demande, elle, suit les paramètres en vigueur.
    const fresh = await createContactRequest(await simulationPayload(), ctx());
    expect(!fresh.ok && fresh.code).toBe("CHANNEL_UNAVAILABLE");
  });

  it("adresse du logement : une seule ligne, sans caractères invisibles", async () => {
    const res = await submit({ streetAddress: "12 rue des Lilas\nConditions confirmées : toutes‮​" });
    const row = await prisma.contactRequest.findUniqueOrThrow({ where: { id: res.requestId } });
    expect(row.streetAddress).toBe("12 rue des Lilas Conditions confirmées : toutes");
  });
});

describe("annulation d'une demande déjà transmise à une entreprise", () => {
  const sent: { emails: EmailMessage[]; hooks: WebhookMessage[] } = { emails: [], hooks: [] };

  beforeEach(async () => {
    await resetDatabase();
    // Annulations non notifiées : l'entreprise à informer l'est quand même.
    await configure({ ...REFERRAL_SETTINGS, notifications: { ...REFERRAL_SETTINGS.notifications, notifyOnCancellation: false } });
    sent.emails = [];
    sent.hooks = [];
    setNotificationTransportForTests({ sendEmail: async (m) => void sent.emails.push(m), postWebhook: async (m) => void sent.hooks.push(m) });
  });
  afterEach(() => setNotificationTransportForTests(null));

  it("demande pas encore transmise : rien à faire auprès d'une entreprise", async () => {
    await prisma.partner.create({ data: { name: PARTNER.name, details: PARTNER.details, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const r = await submit();
    const res = await cancelContactRequest({ reference: r.reference, token: r.cancelToken }, { ip: freshIp() });
    expect(res.ok && res.partnersToInform).toEqual([]);
    const row = await prisma.contactRequest.findUniqueOrThrow({ where: { id: r.requestId }, include: { notifications: true, events: true } });
    expect(row.partnerInformRequiredAt).toBeNull();
    expect(row.events.map((e) => e.type)).not.toContain(PARTNER_TO_INFORM_EVENT);
    expect(row.notifications.filter((n) => n.event !== "NEW_REQUEST")).toHaveLength(0);
  });

  it("annulation avec effacement : l'entreprise est nommée, l'équipe est alertée et la personne prévenue", async () => {
    const partner = await prisma.partner.create({ data: { name: PARTNER.name, details: PARTNER.details, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const r = await submit();
    await markSent(r.requestId, PARTNER.displayName);
    expect(partner.id).toBeTruthy();

    const res = await cancelContactRequest({ reference: r.reference, token: r.cancelToken, deleteData: true }, { ip: freshIp() });
    expect(res.ok && res.partnersToInform).toEqual([PARTNER.displayName]);
    const row = await prisma.contactRequest.findUniqueOrThrow({ where: { id: r.requestId }, include: { notifications: true, events: true } });
    expect(row.status).toBe("CONTACT_ANNULE");
    expect(row.anonymizedAt).not.toBeNull();
    expect(row.partnerInformRequiredAt).not.toBeNull();
    expect(row.partnerInformedAt).toBeNull();
    // Le nom de l'entreprise n'est pas une donnée de la personne : il reste après l'effacement.
    expect(row.requestedPartnerName).toBe(PARTNER.displayName);
    const event = row.events.find((e) => e.type === PARTNER_TO_INFORM_EVENT);
    expect(event?.data).toMatchObject({ partners: [PARTNER.displayName], cancelled: true, deleteData: true, oppose: false, source: "VISITOR" });
    expect(row.notifications.filter((n) => n.event !== "NEW_REQUEST").map((n) => n.event)).toEqual(["PARTNER_TO_INFORM", "PARTNER_TO_INFORM"]);

    await prisma.notification.updateMany({ where: { event: "NEW_REQUEST" }, data: { status: "SENT" } });
    await dispatchPendingNotifications({ requestId: r.requestId });
    expect(sent.emails[0]!.subject).toBe(`Demande ${r.reference} : entreprise partenaire à informer`);
    expect(sent.emails[0]!.text).toContain(`avait été transmise à ${PARTNER.displayName}`);
    const hook = JSON.stringify(sent.hooks[0]!.body);
    expect(hook).toContain("request.partner_to_inform");
    expect(hook).toContain(PARTNER.displayName);
    for (const secret of ["Camille", "Durand", "0612345678", "06 12 34 56 78"]) {
      expect(sent.emails[0]!.text).not.toContain(secret);
      expect(hook).not.toContain(secret);
    }

    // Second passage sans rien de nouveau : pas de nouvelle alerte, la personne est toujours prévenue.
    const again = await cancelContactRequest({ reference: r.reference, token: r.cancelToken }, { ip: freshIp() });
    expect(again.ok && again.alreadyCancelled && again.partnersToInform).toEqual([PARTNER.displayName]);
    expect(await prisma.requestEvent.count({ where: { requestId: r.requestId, type: PARTNER_TO_INFORM_EVENT } })).toBe(1);
  });

  it("rendez-vous transmis puis annulé : l'entreprise du rendez-vous reste à informer d'une annulation ultérieure", async () => {
    await prisma.partner.create({ data: { name: PARTNER.name, details: PARTNER.details, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    await signIn();
    const r = await submit();
    const { requestedPartnerId } = await prisma.contactRequest.findUniqueOrThrow({ where: { id: r.requestId } });
    const booked = await bookAppointmentAction({}, await appointmentForm(r.requestId, { partnerId: requestedPartnerId!, partnerConsent: "on" }));
    expect(booked).toEqual({ ok: true });
    await recordHandoffAction(r.requestId);
    // Rendez-vous annulé : les colonnes sont remises à zéro, l'historique garde la transmission.
    await prisma.contactRequest.update({ where: { id: r.requestId }, data: { status: "CONTACTE", appointmentPartner: null, appointmentPartnerId: null, partnerSentAt: null } });
    const res = await cancelContactRequest({ reference: r.reference, token: r.cancelToken }, { ip: freshIp() });
    expect(res.ok && res.partnersToInform).toEqual([PARTNER.displayName]);
  });
});

describe("fiche d'une demande : actions de l'équipe", () => {
  beforeEach(async () => {
    await resetDatabase();
    await configure(REFERRAL_SETTINGS);
    setNotificationTransportForTests({ sendEmail: async () => undefined, postWebhook: async () => undefined });
  });
  afterEach(() => setNotificationTransportForTests(null));

  it("un e-mail envoyé sur une demande de rappel n'est pas le premier contact (échéance R223-4 maintenue)", async () => {
    await signIn();
    const phone = await submit({ email: "camille@example.com" });
    await logContactAction(form({ id: phone.requestId, outcome: "EMAIL_SENT" }));
    const row = await prisma.contactRequest.findUniqueOrThrow({ where: { id: phone.requestId }, include: { events: true } });
    expect(row.firstContactAt).toBeNull();
    expect(row.status).toBe("NOUVEAU");
    expect(row.events.map((e) => e.type)).toContain("CONTACT_LOGGED");
    // Demande de réponse par e-mail : l'e-mail envoyé est bien la réponse attendue.
    const email = await submit({ channel: "EMAIL", email: "camille@example.com", phone: "" });
    await logContactAction(form({ id: email.requestId, outcome: "EMAIL_SENT" }));
    const emailRow = await prisma.contactRequest.findUniqueOrThrow({ where: { id: email.requestId } });
    expect(emailRow.firstContactAt).not.toBeNull();
    expect(emailRow.status).toBe("CONTACTE");
  });

  it("rendez-vous d'une demande qui nomme une entreprise : cette entreprise ou votre entreprise, jamais une autre", async () => {
    const named = await prisma.partner.create({ data: { name: PARTNER.name, details: PARTNER.details, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    // Une autre entreprise qui ne correspond pas aux réponses : jamais nommée dans la demande.
    const other = await prisma.partner.create({ data: { name: "Isolation Sud", criteria: { works: ["ISOLATION_MURS"] } } });
    await signIn();
    const r = await submit();
    expect((await prisma.contactRequest.findUniqueOrThrow({ where: { id: r.requestId } })).requestedPartnerId).toBe(named.id);

    const refused = await bookAppointmentAction({}, await appointmentForm(r.requestId, { partnerId: other.id, partnerConsent: "on" }));
    expect(refused.error).toBe(
      `Cette demande nomme ${PARTNER.displayName} : le rendez-vous ne peut être confié qu'à cette entreprise ou assuré par votre entreprise.`,
    );
    const unknown = await bookAppointmentAction({}, await appointmentForm(r.requestId, { partnerId: "00000000-0000-4000-8000-000000000000", partnerConsent: "on" }));
    expect(unknown.error).toMatch(/Entreprise partenaire inconnue/);
    const noConsent = await bookAppointmentAction({}, await appointmentForm(r.requestId, { partnerId: named.id }));
    expect(noConsent.error).toMatch(/Cochez l'accord de la personne/);
    expect((await prisma.contactRequest.findUniqueOrThrow({ where: { id: r.requestId } })).status).toBe("NOUVEAU");

    expect(await bookAppointmentAction({}, await appointmentForm(r.requestId, { partnerId: named.id, partnerConsent: "on" }))).toEqual({ ok: true });
    const row = await prisma.contactRequest.findUniqueOrThrow({ where: { id: r.requestId } });
    expect([row.status, row.appointmentPartner, row.appointmentPartnerId]).toEqual(["RDV_FIXE", PARTNER.displayName, named.id]);
    expect(row.partnerConsentAt).not.toBeNull();
  });

  it("rendez-vous assuré par votre entreprise : aucune entreprise enregistrée", async () => {
    await prisma.partner.create({ data: { name: PARTNER.name, details: PARTNER.details, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    await signIn();
    const r = await submit();
    expect(await bookAppointmentAction({}, await appointmentForm(r.requestId, { partnerId: "" }))).toEqual({ ok: true });
    const row = await prisma.contactRequest.findUniqueOrThrow({ where: { id: r.requestId } });
    expect([row.appointmentPartner, row.appointmentPartnerId, row.partnerConsentAt]).toEqual([null, null, null]);
  });

  it("demande sans entreprise nommée : rendez-vous confié à une entreprise active, retrouvée par son identifiant", async () => {
    // Dénomination reprise de l'ancienne liste libre, avec des espaces doubles : l'identifiant suffit.
    const legacy = await prisma.partner.create({ data: { name: "Thermo  Nord", criteria: { works: ["ISOLATION_MURS"] } } });
    await signIn();
    const r = await submit();
    expect((await prisma.contactRequest.findUniqueOrThrow({ where: { id: r.requestId } })).requestedPartnerId).toBeNull();
    expect(await bookAppointmentAction({}, await appointmentForm(r.requestId, { partnerId: legacy.id, partnerConsent: "on" }))).toEqual({ ok: true });
    const row = await prisma.contactRequest.findUniqueOrThrow({ where: { id: r.requestId } });
    expect([row.appointmentPartner, row.appointmentPartnerId]).toEqual(["Thermo  Nord", legacy.id]);
  });

  it("opposition recueillie par l'équipe sur une demande transmise : entreprise à informer, puis informée", async () => {
    await prisma.partner.create({ data: { name: PARTNER.name, details: PARTNER.details, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const user = await signIn();
    const r = await submit();
    await markSent(r.requestId, PARTNER.displayName);
    await recordOppositionAction(form({ id: r.requestId }));
    let row = await prisma.contactRequest.findUniqueOrThrow({ where: { id: r.requestId }, include: { events: true, notifications: true } });
    expect(row.status).toBe("CONTACT_ANNULE");
    expect(row.partnerInformRequiredAt).not.toBeNull();
    expect(row.events.find((e) => e.type === PARTNER_TO_INFORM_EVENT)?.data).toMatchObject({
      partners: [PARTNER.displayName],
      oppose: true,
      cancelled: true,
      source: "STAFF",
    });
    expect(row.notifications.filter((n) => n.event === "PARTNER_TO_INFORM")).toHaveLength(2);

    await markPartnerInformedAction(form({ id: r.requestId }));
    await markPartnerInformedAction(form({ id: r.requestId }));
    row = await prisma.contactRequest.findUniqueOrThrow({ where: { id: r.requestId }, include: { events: true, notifications: true } });
    expect(row.partnerInformedAt).not.toBeNull();
    const informed = row.events.filter((e) => e.type === "PARTNER_INFORMED");
    expect(informed).toHaveLength(1);
    expect(informed[0]).toMatchObject({ actorId: user.id, data: { partners: [PARTNER.displayName] } });

    // Effacement demandé ensuite : nouvelle information à faire.
    await anonymizeAction(form({ id: r.requestId }));
    row = await prisma.contactRequest.findUniqueOrThrow({ where: { id: r.requestId }, include: { events: true, notifications: true } });
    expect(row.partnerInformedAt).toBeNull();
    expect(row.events.filter((e) => e.type === PARTNER_TO_INFORM_EVENT)).toHaveLength(2);
  });
});

describe("anonymisation : caractéristiques précises du logement", () => {
  beforeEach(async () => {
    await resetDatabase();
    await configure();
  });

  it("efface surface, radiateurs, emplacement de la chaudière et taille du foyer, et ramène l'année à la décennie", async () => {
    const res = await createContactRequest(await simulationPayload(), ctx());
    if (!res.ok) throw new Error(res.code);
    const before = await prisma.contactRequest.findUniqueOrThrow({ where: { id: res.requestId } });
    expect([before.heatedArea, before.radiatorCount, before.boilerLocation, before.householdSize]).toEqual([120, 9, "GARAGE", 3]);
    expect([before.constructionYearMin, before.constructionYearMax]).toEqual([1985, 1985]);

    await prisma.$transaction((tx) => anonymizeRequest(tx, res.requestId, null, "test"));
    const row = await prisma.contactRequest.findUniqueOrThrow({ where: { id: res.requestId } });
    expect([row.heatedArea, row.radiatorCount, row.boilerLocation, row.householdSize]).toEqual([null, null, null, null]);
    expect([row.constructionYearMin, row.constructionYearMax]).toEqual([1980, 1989]);
    const answers = row.answers as Record<string, unknown>;
    for (const key of ["postalCode", "communeInsee", "communeName", "heatedArea", "radiatorCount", "boilerLocation", "householdSize"]) {
      expect(answers[key], key).toBeUndefined();
    }
    expect(answers.construction).toEqual({ kind: "PERIOD", from: 1980, to: 1989 });
    // Statistiques conservées : travaux, chauffage, catégorie de revenus.
    expect([answers.heatPumpType, answers.currentHeating, row.incomeCategory, row.heatEmitters]).toEqual([
      "PAC_AIR_EAU",
      "CHAUDIERE_FIOUL",
      "MODESTE",
      "RADIATEURS_FONTE",
    ]);
  });
});
