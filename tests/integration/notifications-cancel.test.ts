import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { dispatchPendingNotifications } from "@/lib/notifications/dispatch";
import { type EmailMessage, setNotificationTransportForTests, type WebhookMessage } from "@/lib/notifications/transports";
import { cancelContactRequest } from "@/lib/requests/cancel";
import { createContactRequest } from "@/lib/requests/create";
import { configure, freshIp, resetDatabase, simulationPayload } from "./helpers";

const ctx = () => ({ ip: freshIp(), userAgent: "vitest" });

describe("notifications internes", () => {
  const sent: { emails: EmailMessage[]; hooks: WebhookMessage[] } = { emails: [], hooks: [] };

  beforeEach(async () => {
    await resetDatabase();
    await configure();
    sent.emails = [];
    sent.hooks = [];
  });
  afterEach(() => setNotificationTransportForTests(null));

  it("l'échec d'une notification n'empêche jamais l'enregistrement de la demande", async () => {
    setNotificationTransportForTests({
      sendEmail: async () => {
        throw new Error("SMTP indisponible");
      },
      postWebhook: async () => {
        throw new Error("Webhook indisponible");
      },
    });
    const res = await createContactRequest(await simulationPayload(), ctx());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const r = await dispatchPendingNotifications({ requestId: res.requestId });
    expect(r).toEqual({ sent: 0, failed: 2 });
    const notifs = await prisma.notification.findMany({ where: { requestId: res.requestId } });
    expect(notifs.every((n) => n.status === "FAILED" && n.attempts === 1 && n.nextAttemptAt > new Date())).toBe(true);
    expect(await prisma.contactRequest.count()).toBe(1);

    // Rétablissement du service : la relance aboutit.
    setNotificationTransportForTests({
      sendEmail: async (m) => void sent.emails.push(m),
      postWebhook: async (m) => void sent.hooks.push(m),
    });
    await prisma.notification.updateMany({ data: { nextAttemptAt: new Date() } });
    expect(await dispatchPendingNotifications()).toEqual({ sent: 2, failed: 0 });
  });

  it("le message ne contient qu'une référence et un lien sécurisé, sans données personnelles", async () => {
    setNotificationTransportForTests({
      sendEmail: async (m) => void sent.emails.push(m),
      postWebhook: async (m) => void sent.hooks.push(m),
    });
    const res = await createContactRequest(await simulationPayload(), ctx());
    if (!res.ok) throw new Error("création impossible");
    await dispatchPendingNotifications({ requestId: res.requestId });
    const email = sent.emails[0]!;
    expect(email.subject).toContain(res.reference);
    expect(email.text).toContain(`/admin/demandes/${res.requestId}`);
    for (const secret of ["Camille", "Durand", "0612345678", "06 12 34 56 78", "Lyon"]) {
      expect(email.text).not.toContain(secret);
      expect(JSON.stringify(sent.hooks[0]!.body)).not.toContain(secret);
    }
  });
});

describe("annulation par le visiteur", () => {
  beforeEach(async () => {
    await resetDatabase();
    await configure();
    setNotificationTransportForTests({ sendEmail: async () => undefined, postWebhook: async () => undefined });
  });
  afterEach(() => setNotificationTransportForTests(null));

  async function create(contact: Record<string, unknown> = {}) {
    const res = await createContactRequest(await simulationPayload({}, contact), ctx());
    if (!res.ok) throw new Error("création impossible");
    return res;
  }

  it("annule avec le lien personnel et notifie l'équipe", async () => {
    const r = await create();
    const res = await cancelContactRequest({ reference: r.reference, token: r.cancelToken }, { ip: freshIp() });
    expect(res.ok && !res.alreadyCancelled).toBe(true);
    const row = await prisma.contactRequest.findUniqueOrThrow({ where: { reference: r.reference }, include: { events: true, notifications: true } });
    expect(row.status).toBe("CONTACT_ANNULE");
    expect(row.cancelledBy).toBe("VISITOR");
    expect(row.events.map((e) => e.type)).toContain("CANCELLED_BY_VISITOR");
    expect(row.notifications.filter((n) => n.event === "REQUEST_CANCELLED")).toHaveLength(2);
    // Second clic : idempotent.
    const again = await cancelContactRequest({ reference: r.reference, token: r.cancelToken }, { ip: freshIp() });
    expect(again.ok && again.alreadyCancelled).toBe(true);
  });

  it("refuse un jeton invalide sans révéler si la référence existe", async () => {
    const r = await create();
    const bad = await cancelContactRequest({ reference: r.reference, token: "x".repeat(43) }, { ip: freshIp() });
    const unknown = await cancelContactRequest({ reference: "PE-0000-0000", token: r.cancelToken }, { ip: freshIp() });
    expect(!bad.ok && bad.status).toBe(404);
    expect(!unknown.ok && unknown.status).toBe(404);
    if (!bad.ok && !unknown.ok) expect(bad.message).toBe(unknown.message);
    expect((await prisma.contactRequest.findUniqueOrThrow({ where: { reference: r.reference } })).status).toBe("NOUVEAU");
  });

  it("efface les coordonnées sur demande et enregistre l'opposition", async () => {
    const r = await create();
    await cancelContactRequest({ reference: r.reference, token: r.cancelToken, deleteData: true, oppose: true }, { ip: freshIp() });
    const row = await prisma.contactRequest.findUniqueOrThrow({ where: { reference: r.reference } });
    expect(row.anonymizedAt).not.toBeNull();
    expect([row.firstName, row.lastName, row.phone, row.email, row.comment, row.postalCode]).toEqual([null, null, null, null, null, null]);
    expect(row.phoneHash).not.toBeNull(); // preuve conservée sous forme d'empreinte
    expect(await prisma.opposition.count()).toBe(1);

    // Nouvelle demande explicite du même numéro : enregistrée mais signalée.
    const next = await create();
    const nextRow = await prisma.contactRequest.findUniqueOrThrow({ where: { reference: next.reference } });
    expect(nextRow.oppositionMatch).toBe(true);
  });
});
