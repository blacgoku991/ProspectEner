import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_RULESET, pruneAnswers, type Answers } from "@/engine";
import { partnerNameInUse, transmittedWhere } from "@/app/admin/(panel)/partenaires/queries";
import { prisma } from "@/lib/db";
import { HYDRAULIC_HEAT_PUMP_PRESET, referenceYearOf, selectPartnerForRequest } from "@/lib/leads/partners";
import { listPartners, partnerDisplayName } from "@/lib/leads/partners-db";
import { requestLeadProfile } from "@/lib/leads/profile";
import {
  exportRequestedLeads,
  markRequestedPartnerSent,
  pendingRequestedLeads,
  REQUESTED_PARTNER_SENT_EVENT,
  requestedCounts,
  transmitRequestedLeads,
  USAGE_TERMS,
} from "@/lib/leads/requested-partner";
import { toPublicConfig } from "@/lib/public-config";
import { anonymizeRequest } from "@/lib/requests/anonymize";
import { createContactRequest } from "@/lib/requests/create";
import { getSettings } from "@/lib/settings";
import type { SiteSettings } from "@/lib/settings-schema";
import { ANSWERS_ELIGIBLE, configure, freshIp, resetDatabase, simulationPayload, TEST_SETTINGS } from "./helpers";

const ctx = () => ({ ip: freshIp(), userAgent: "vitest" });
const REFERRAL_SETTINGS: SiteSettings = { ...TEST_SETTINGS, activity: { ...TEST_SETTINGS.activity, kinds: ["MISE_EN_RELATION"] } };
const PARTNER = { name: "Chauffage Lyonnais", details: "Lyon, RGE" };
const DAY = 24 * 3600 * 1000;

let phoneCounter = 0;
/** Numéro distinct par demande : une opposition ne vise qu'une seule demande du jeu d'essai. */
const nextPhone = () => `06 12 34 ${String(10 + (phoneCounter++ % 80)).padStart(2, "0")} 78`;

/** Demande envoyée comme par le navigateur (entreprise affichée, puis vérifiée par le serveur). */
async function submit(contact: Record<string, unknown> = {}, answers: Answers = ANSWERS_ELIGIBLE) {
  const payload = await simulationPayload({ answers }, { phone: nextPhone(), ...contact });
  const config = toPublicConfig(await getSettings(), await listPartners({ activeOnly: true }));
  const pruned = pruneAnswers(answers, { rules: DEFAULT_RULESET.data, referenceDate: payload.referenceDate });
  const partner = selectPartnerForRequest(requestLeadProfile(pruned), config.partners, referenceYearOf(payload.referenceDate));
  const res = await createContactRequest({ ...payload, partnerId: partner?.id ?? null, partnerName: partner?.displayName ?? null }, ctx());
  if (!res.ok) throw new Error(`création impossible : ${res.code}`);
  return prisma.contactRequest.findUniqueOrThrow({ where: { reference: res.reference } });
}

const csvLines = (csv: string) => csv.replace(/^﻿/, "").trim().split("\r\n");
const cells = (line: string) => line.split('";"').map((c) => c.replace(/^"|"$/g, ""));
const sentEvents = (requestId: string) => prisma.requestEvent.findMany({ where: { requestId, type: REQUESTED_PARTNER_SENT_EVENT } });

describe("transmission des demandes à l'entreprise qu'elles nomment", () => {
  beforeEach(async () => {
    await resetDatabase();
    await configure(REFERRAL_SETTINGS);
  });

  it("transmission confirmée : seules les demandes présentées et transmissibles sont marquées, tracées et exportées, une seule fois", async () => {
    const partner = await prisma.partner.create({ data: { ...PARTNER, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const a = await submit({ firstName: "Alice", lastName: "Martin", streetAddress: "12 rue des Lilas" });
    const b = await submit({ firstName: "Bruno", lastName: "Petit", channel: "EMAIL", email: "bruno@example.com" });
    const cancelled = await submit({ lastName: "Annule" });
    await prisma.contactRequest.update({ where: { id: cancelled.id }, data: { status: "CONTACT_ANNULE" } });
    const anonymized = await submit();
    await prisma.$transaction((tx) => anonymizeRequest(tx, anonymized.id, null, "test"));
    const demo = await submit({ lastName: "Demo" });
    await prisma.contactRequest.update({ where: { id: demo.id }, data: { isDemo: true } });
    const other = await submit({ lastName: "Autre" }, { ...ANSWERS_ELIGIBLE, heatedArea: 79 } as Answers);
    expect(other.requestedPartnerId).toBeNull();

    const now = new Date();
    expect(await requestedCounts(partner.id, now)).toEqual({ requested: 3, pending: 2, blocked: 1, sent: 0, resendable: 0 });
    const shown = await pendingRequestedLeads(partner, now);
    expect(shown).toEqual({ ids: [a.id, b.id], otherName: 0 });

    // Identifiants non transmissibles ajoutés à la main : ignorés.
    const first = await transmitRequestedLeads({ partner, ids: [...shown.ids, cancelled.id, demo.id, other.id], actorId: null, now });
    expect(first.count).toBe(2);
    const [header, ...lines] = csvLines(first.csv);
    const headers = cells(header!);
    expect(headers.slice(0, 8)).toEqual([
      "Référence",
      "Date de la demande",
      "À rappeler avant le",
      "Canal demandé",
      "Phrase de la demande",
      "Nom à la demande ≠ nom actuel",
      "Nom",
      "Prénom",
    ]);
    expect(headers.at(-1)).toBe("Conditions d'usage");
    expect(lines).toHaveLength(2);
    const alice = cells(lines.find((l) => l.includes("Alice"))!);
    expect(alice[0]).toBe(a.reference);
    expect(alice[2]).toMatch(/^\d{2}\/\d{2}\/\d{4}$/); // échéance de rappel (heure de Paris)
    expect(alice[3]).toBe("Rappel téléphonique");
    expect(alice[4]).toBe(a.requestSentence);
    expect(alice[5]).toBe("Non");
    expect(alice).toContain("12 rue des Lilas");
    expect(alice.at(-1)).toBe(USAGE_TERMS.PHONE);
    const bruno = cells(lines.find((l) => l.includes("Bruno"))!);
    expect(bruno[3]).toBe("Réponse par e-mail");
    expect(bruno).toContain("bruno@example.com");
    expect(bruno.at(-1)).toBe(USAGE_TERMS.EMAIL);
    for (const absent of ["Annule", "Demo", "Autre"]) expect(first.csv).not.toContain(absent);

    for (const id of [a.id, b.id]) {
      const row = await prisma.contactRequest.findUniqueOrThrow({ where: { id } });
      expect(row.requestedPartnerSentAt?.toISOString()).toBe(now.toISOString());
      expect((await sentEvents(id)).map((e) => e.data)).toEqual([{ partner: partnerDisplayName(partner) }]);
    }
    for (const id of [cancelled.id, demo.id, other.id]) {
      expect((await prisma.contactRequest.findUniqueOrThrow({ where: { id } })).requestedPartnerSentAt).toBeNull();
    }
    expect(await requestedCounts(partner.id)).toEqual({ requested: 3, pending: 0, blocked: 1, sent: 2, resendable: 2 });

    // Même confirmation rejouée : rien de plus n'est marqué ni exporté.
    const again = await transmitRequestedLeads({ partner, ids: shown.ids, actorId: null, now: new Date(now.getTime() + 60_000) });
    expect(again.count).toBe(0);
    expect(csvLines(again.csv)).toHaveLength(1);

    // Nouveau téléchargement : les mêmes demandes, sans rien modifier ni tracer.
    const copy = await exportRequestedLeads({ partner, now: new Date(now.getTime() + 60_000) });
    expect(copy.count).toBe(2);
    expect(copy.csv).toContain("Alice");
    expect(await prisma.requestEvent.count({ where: { type: REQUESTED_PARTNER_SENT_EVENT } })).toBe(2);
    expect((await prisma.contactRequest.findUniqueOrThrow({ where: { id: a.id } })).requestedPartnerSentAt?.toISOString()).toBe(now.toISOString());
  });

  it("délai de rappel dépassé, demande close ou à vérifier, opposition, rendez-vous confié à une autre entreprise : jamais transmises, comptées à part", async () => {
    const partner = await prisma.partner.create({ data: { ...PARTNER, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const otherPartner = await prisma.partner.create({ data: { name: "Autre Entreprise", criteria: { works: ["ISOLATION_MURS"] } } });
    const now = new Date();
    const past = new Date(now.getTime() - DAY);
    const future = new Date(now.getTime() + 30 * DAY);

    const ok = await submit({ lastName: "Dansledelai" });
    const email = await submit({ lastName: "Parmail", channel: "EMAIL", email: "parmail@example.com" });
    const overdue = await submit({ lastName: "Endretard" });
    await prisma.contactRequest.update({ where: { id: overdue.id }, data: { callbackDeadline: past } });
    // Délai dépassé même après un premier échange de l'équipe : le délai de l'entreprise court depuis la demande.
    const contactedLate = await submit({ lastName: "Contacteeendretard" });
    await prisma.contactRequest.update({ where: { id: contactedLate.id }, data: { status: "CONTACTE", firstContactAt: past, callbackDeadline: past } });
    const statuses = {} as Record<"SANS_SUITE" | "TERMINE" | "A_VERIFIER" | "CONTACTE" | "RDV_FIXE" | "ETUDE_EN_COURS", string>;
    for (const status of ["SANS_SUITE", "TERMINE", "A_VERIFIER", "CONTACTE", "RDV_FIXE", "ETUDE_EN_COURS"] as const) {
      const r = await submit({ lastName: `Statut ${status.toLowerCase().replace(/_/g, " ")}` });
      await prisma.contactRequest.update({ where: { id: r.id }, data: { status } });
      statuses[status] = r.id;
    }
    // Contact déjà dans la liste d'opposition lors de la demande, statut remis à « Nouveau » à la main.
    const matched = await submit({ lastName: "Oppositionconnue" });
    await prisma.contactRequest.update({ where: { id: matched.id }, data: { oppositionMatch: true, status: "NOUVEAU" } });
    // Oppositions enregistrées après la demande : sans échéance, échéance future, ou échue.
    const opposedPhone = await submit({ lastName: "Opposetelephone" });
    await prisma.opposition.create({ data: { phoneHash: opposedPhone.phoneHash, maskedValue: "06 •• •• •• 78", source: "test" } });
    const opposedEmail = await submit({ lastName: "Opposemail", email: "oppose@example.com" });
    expect(opposedEmail.emailHash).not.toBeNull();
    await prisma.opposition.create({ data: { emailHash: opposedEmail.emailHash, maskedValue: "o•••@example.com", source: "test", expiresAt: future } });
    const expired = await submit({ lastName: "Oppositionechue" });
    await prisma.opposition.create({ data: { phoneHash: expired.phoneHash, maskedValue: "06 •• •• •• 78", source: "test", expiresAt: past } });
    // Rendez-vous confié à une autre entreprise, ou à celle qui est nommée.
    const elsewhere = await submit({ lastName: "Ailleurs" });
    await prisma.contactRequest.update({
      where: { id: elsewhere.id },
      data: { status: "RDV_FIXE", appointmentPartner: otherPartner.name, appointmentPartnerId: otherPartner.id },
    });
    const elsewhereLegacy = await submit({ lastName: "Ailleursancien" });
    await prisma.contactRequest.update({ where: { id: elsewhereLegacy.id }, data: { status: "RDV_FIXE", appointmentPartner: "Entreprise Supprimée" } });
    const here = await submit({ lastName: "Ici" });
    await prisma.contactRequest.update({
      where: { id: here.id },
      data: { status: "RDV_FIXE", appointmentPartner: partnerDisplayName(partner), appointmentPartnerId: partner.id },
    });

    const expected = [ok.id, email.id, statuses.CONTACTE, statuses.RDV_FIXE, statuses.ETUDE_EN_COURS, expired.id, here.id];
    const shown = await pendingRequestedLeads(partner, now);
    expect(shown.ids.sort()).toEqual([...expected].sort());
    const counts = await requestedCounts(partner.id, now);
    expect(counts).toMatchObject({ pending: expected.length, sent: 0 });
    expect(counts.blocked).toBe(counts.requested - expected.length);
    expect(counts.blocked).toBe(10);

    // Tous les identifiants proposés à la main : seules les demandes transmissibles sont marquées.
    const all = await prisma.contactRequest.findMany({ where: { requestedPartnerId: partner.id }, select: { id: true } });
    const result = await transmitRequestedLeads({ partner, ids: all.map((r) => r.id), actorId: null, now });
    expect(result.count).toBe(expected.length);
    const marked = await prisma.contactRequest.findMany({ where: { requestedPartnerSentAt: { not: null } }, select: { id: true } });
    expect(marked.map((r) => r.id).sort()).toEqual([...expected].sort());
    for (const name of ["Endretard", "Contacteeendretard", "Statut sans suite", "Statut termine", "Statut a verifier", "Oppositionconnue", "Opposetelephone", "Opposemail", "Ailleurs"]) {
      expect(result.csv, name).not.toContain(`"${name}"`);
    }

    // Une opposition reçue après la transmission : la demande n'est plus remise, même à nouveau.
    await prisma.opposition.create({ data: { phoneHash: ok.phoneHash, maskedValue: "06 •• •• •• 78", source: "test" } });
    const copy = await exportRequestedLeads({ partner, now });
    expect(copy.count).toBe(expected.length - 1);
    expect(copy.csv).not.toContain('"Dansledelai"');
    // Délai de rappel échu depuis : plus remise non plus (les réponses par e-mail n'ont pas de délai).
    const later = await exportRequestedLeads({ partner, now: new Date(now.getTime() + 60 * DAY) });
    expect(cells(csvLines(later.csv)[1] ?? "")).toContain("Parmail");
    expect(later.count).toBe(1);
  });

  it("marquage protégé : une demande annulée ou anonymisée après l'affichage n'est ni marquée ni exportée", async () => {
    const partner = await prisma.partner.create({ data: { ...PARTNER, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const keep = await submit({ lastName: "Garde" });
    const cancelled = await submit({ lastName: "Annulee" });
    const anonymized = await submit({ lastName: "Effacee" });
    const shown = await pendingRequestedLeads(partner);
    expect(shown.ids).toHaveLength(3);
    // Entre l'affichage et la confirmation : annulation par la personne, anonymisation.
    await prisma.contactRequest.update({ where: { id: cancelled.id }, data: { status: "CONTACT_ANNULE", cancelledAt: new Date() } });
    await prisma.$transaction((tx) => anonymizeRequest(tx, anonymized.id, null, "test"));

    const result = await transmitRequestedLeads({ partner, ids: shown.ids, actorId: null });
    expect(result.count).toBe(1);
    expect(result.csv).toContain('"Garde"');
    expect(result.csv).not.toContain("Annulee");
    for (const id of [cancelled.id, anonymized.id]) {
      expect((await prisma.contactRequest.findUniqueOrThrow({ where: { id } })).requestedPartnerSentAt).toBeNull();
      expect(await sentEvents(id)).toHaveLength(0);
    }
    expect((await prisma.contactRequest.findUniqueOrThrow({ where: { id: keep.id } })).requestedPartnerSentAt).not.toBeNull();
  });

  it("deux transmissions simultanées : chaque demande n'est marquée et tracée qu'une fois", async () => {
    const partner = await prisma.partner.create({ data: { ...PARTNER, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const ids = [(await submit()).id, (await submit()).id, (await submit()).id];
    const now = Date.now();
    const [x, y] = await Promise.all([
      markRequestedPartnerSent(partner, ids, null, new Date(now + 1)),
      markRequestedPartnerSent(partner, ids, null, new Date(now + 2)),
    ]);
    expect([...x, ...y].sort()).toEqual([...ids].sort());
    expect(await prisma.requestEvent.count({ where: { type: REQUESTED_PARTNER_SENT_EVENT } })).toBe(3);
    expect((await requestedCounts(partner.id)).pending).toBe(0);
  });

  it("entreprise nommée sous un autre nom (précisions modifiées depuis) : signalé avant la confirmation et dans l'export", async () => {
    const partner = await prisma.partner.create({ data: { ...PARTNER, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const before = await submit({ lastName: "Avant" });
    const updated = await prisma.partner.update({ where: { id: partner.id }, data: { details: "Villeurbanne, RGE" } });
    const after = await submit({ lastName: "Apres" });
    expect([before.requestedPartnerName, after.requestedPartnerName]).toEqual(["Chauffage Lyonnais, Lyon, RGE", "Chauffage Lyonnais, Villeurbanne, RGE"]);
    const shown = await pendingRequestedLeads(updated);
    expect(shown.otherName).toBe(1);
    const result = await transmitRequestedLeads({ partner: updated, ids: shown.ids, actorId: null });
    const rows = csvLines(result.csv).slice(1).map(cells);
    expect(rows.find((r) => r.includes("Avant"))![5]).toBe("Oui");
    expect(rows.find((r) => r.includes("Apres"))![5]).toBe("Non");
  });
});

describe("rendez-vous confiés à une entreprise et dénomination verrouillée", () => {
  beforeEach(async () => {
    await resetDatabase();
    await configure(REFERRAL_SETTINGS);
  });

  it("rendez-vous transmis : par identifiant, ou par nom pour les rendez-vous enregistrés avant l'identifiant", async () => {
    const a = await prisma.partner.create({ data: { name: "Acme", details: "Lille", criteria: { works: ["ISOLATION_MURS"] } } });
    const b = await prisma.partner.create({ data: { name: "Acme Nord", criteria: { works: ["ISOLATION_MURS"] } } });
    const consent = { partnerConsentAt: new Date(), status: "RDV_FIXE" as const };
    const byId = await submit({ lastName: "Parident" });
    // Nom annoncé avant une modification des précisions : toujours rattaché par l'identifiant.
    await prisma.contactRequest.update({ where: { id: byId.id }, data: { ...consent, appointmentPartner: "Acme, Roubaix", appointmentPartnerId: a.id } });
    const legacy = await submit({ lastName: "Ancien" });
    await prisma.contactRequest.update({ where: { id: legacy.id }, data: { ...consent, appointmentPartner: "Acme, Lille" } });
    // Même nom affiché mais confié à une autre entreprise : jamais repris dans l'export de la première.
    const otherId = await submit({ lastName: "Autreentreprise" });
    await prisma.contactRequest.update({ where: { id: otherId.id }, data: { ...consent, appointmentPartner: "Acme, Lille", appointmentPartnerId: b.id } });
    const noConsent = await submit({ lastName: "Sansaccord" });
    await prisma.contactRequest.update({ where: { id: noConsent.id }, data: { status: "RDV_FIXE", appointmentPartner: "Acme, Lille", appointmentPartnerId: a.id } });

    const ids = async (p: typeof a) => (await prisma.contactRequest.findMany({ where: transmittedWhere(p), select: { id: true } })).map((r) => r.id).sort();
    expect(await ids(a)).toEqual([byId.id, legacy.id].sort());
    expect(await ids(b)).toEqual([otherId.id]);
  });

  it("dénomination verrouillée dès qu'une demande nomme l'entreprise ou qu'un rendez-vous lui est confié", async () => {
    const partner = await prisma.partner.create({ data: { ...PARTNER, criteria: HYDRAULIC_HEAT_PUMP_PRESET } });
    const legacy = await prisma.partner.create({ data: { name: "Isolation Ancienne", active: false, criteria: { works: ["ISOLATION_MURS"] } } });
    expect(await partnerNameInUse(partner)).toBe(false);
    await submit();
    expect(await partnerNameInUse(partner)).toBe(true);
    expect(await partnerNameInUse(legacy)).toBe(false);
    const r = await submit({}, { ...ANSWERS_ELIGIBLE, heatedArea: 79 } as Answers);
    await prisma.contactRequest.update({ where: { id: r.id }, data: { appointmentPartner: "Isolation Ancienne" } });
    expect(await partnerNameInUse(legacy)).toBe(true);
  });
});
