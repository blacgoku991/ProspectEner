import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { HYDRAULIC_HEAT_PUMP_PRESET } from "@/lib/leads/partners";
import { REQUESTED_PARTNER_SENT_EVENT } from "@/lib/leads/requested-partner";
import { createContactRequest } from "@/lib/requests/create";
import type { SiteSettings } from "@/lib/settings-schema";
import { configure, freshIp, resetDatabase, simulationPayload, TEST_SETTINGS } from "./helpers";

/** Session d'administrateur simulée : les actions serveur sont appelées hors de Next.js. */
const session = vi.hoisted(() => ({ user: { id: "", email: "admin@test.invalid", role: "ADMIN", canExport: true }, settings: {} }));
vi.mock("@/lib/auth/guards", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/guards")>()),
  requireAdmin: async () => session,
}));
vi.mock("@/lib/request-context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/request-context")>()),
  requestContext: async () => ({ ip: "203.0.113.200", userAgent: "vitest", origin: null }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { deletePartnerAction, savePartnerAction, togglePartnerAction, transmitRequestedAction } = await import("@/app/admin/(panel)/partenaires/actions");

const REFERRAL_SETTINGS: SiteSettings = { ...TEST_SETTINGS, activity: { ...TEST_SETTINGS.activity, kinds: ["MISE_EN_RELATION"] } };

function form(values: Record<string, string | string[] | undefined>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined) continue;
    for (const item of Array.isArray(v) ? v : [v]) f.append(k, item);
  }
  return f;
}

const presetForm = (name: string, details = "", extra: Record<string, string | string[]> = {}) =>
  form({
    name,
    details,
    active: "on",
    works: HYDRAULIC_HEAT_PUMP_PRESET.works,
    incomeCategories: HYDRAULIC_HEAT_PUMP_PRESET.incomeCategories,
    housingTypes: HYDRAULIC_HEAT_PUMP_PRESET.housingTypes,
    currentHeating: HYDRAULIC_HEAT_PUMP_PRESET.currentHeating,
    heatEmitters: HYDRAULIC_HEAT_PUMP_PRESET.heatEmitters,
    minHeatedArea: "80",
    minBuildingAge: "2",
    ...extra,
  });

/** Les actions de création et de suppression redirigent (NEXT_REDIRECT) : la redirection est le succès attendu. */
async function expectRedirect(p: Promise<unknown>) {
  await expect(p).rejects.toMatchObject({ digest: expect.stringMatching(/^NEXT_REDIRECT/) });
}

async function namedRequest() {
  const payload = await simulationPayload();
  const partner = await prisma.partner.findFirstOrThrow({ where: { active: true } });
  const displayName = partner.details ? `${partner.name}, ${partner.details}` : partner.name;
  const res = await createContactRequest({ ...payload, partnerId: partner.id, partnerName: displayName }, { ip: freshIp(), userAgent: "vitest" });
  if (!res.ok) throw new Error(`création impossible : ${res.code}`);
  return prisma.contactRequest.findUniqueOrThrow({ where: { reference: res.reference } });
}

describe("fiche d'une entreprise partenaire (actions de l'administration)", () => {
  beforeEach(async () => {
    await resetDatabase();
    await configure(REFERRAL_SETTINGS);
    const admin = await prisma.staffUser.create({ data: { email: "admin@test.invalid", displayName: "Admin", role: "ADMIN" } });
    session.user.id = admin.id;
  });

  it("refuse un nom ou un nom affiché qui peut être confondu avec celui d'une autre entreprise (casse ignorée)", async () => {
    await expectRedirect(savePartnerAction({}, presetForm("Acme", "Lille")));
    for (const [name, details] of [["Acme, Lille", ""], ["ACME", "Roubaix"], ["acme, lille", ""]] as const) {
      const res = await savePartnerAction({}, presetForm(name, details));
      expect(res.error, `${name} / ${details}`).toMatch(/peut être confondu avec l'entreprise « Acme, Lille »/);
      expect(res.values?.name).toBe(name);
    }
    // Même précision, autre dénomination : aucune confusion possible.
    await expectRedirect(savePartnerAction({}, presetForm("Thermo", "Lille")));
    expect((await prisma.partner.findMany({ orderBy: { name: "asc" } })).map((p) => p.name)).toEqual(["Acme", "Thermo"]);
    // Modification d'une autre fiche vers un nom affiché déjà pris : refusée aussi.
    await expectRedirect(savePartnerAction({}, presetForm("Acme Nord")));
    const nord = await prisma.partner.findFirstOrThrow({ where: { name: "Acme Nord" } });
    expect((await savePartnerAction({}, presetForm("Acme", "Lille", { id: nord.id }))).error).toMatch(/peut être confondu/);
    // Sa propre fiche ne se confond pas avec elle-même.
    const acme = await prisma.partner.findFirstOrThrow({ where: { name: "Acme" } });
    expect((await savePartnerAction({}, presetForm("Acme", "Lille", { id: acme.id }))).ok).toBe("Modifications enregistrées.");
  });

  it("dénomination verrouillée dès qu'une demande nomme l'entreprise : précisions et critères restent modifiables", async () => {
    await expectRedirect(savePartnerAction({}, presetForm("Chauffage Lyonnais", "Lyon, RGE")));
    const partner = await prisma.partner.findFirstOrThrow();
    // Sans demande : la dénomination peut changer.
    expect((await savePartnerAction({}, presetForm("Chauffage Lyonnais SARL", "Lyon, RGE", { id: partner.id }))).ok).toBe("Modifications enregistrées.");
    await namedRequest();

    const renamed = await savePartnerAction({}, presetForm("Autre Entreprise", "Lyon, RGE", { id: partner.id }));
    expect(renamed.error).toMatch(/^Des demandes nomment déjà cette entreprise ou lui ont été confiées : sa dénomination ne peut plus changer/);
    expect(renamed.values?.name).toBe("Chauffage Lyonnais SARL");
    expect((await prisma.partner.findUniqueOrThrow({ where: { id: partner.id } })).name).toBe("Chauffage Lyonnais SARL");

    // Précisions, critères, casse et espaces : modifiables.
    const edited = await savePartnerAction({}, presetForm("chauffage  lyonnais sarl", "Villeurbanne, RGE", { id: partner.id, minHeatedArea: "90" }));
    expect(edited.ok).toBe("Modifications enregistrées.");
    const after = await prisma.partner.findUniqueOrThrow({ where: { id: partner.id } });
    expect([after.name, after.details]).toEqual(["chauffage lyonnais sarl", "Villeurbanne, RGE"]);
    expect((after.criteria as { minHeatedArea: number }).minHeatedArea).toBe(90);

    // Journal : nom, champs modifiés, critères avant et après ; aucune donnée de demande.
    const log = await prisma.auditLog.findFirstOrThrow({ where: { targetId: partner.id, action: "SETTINGS_UPDATED" }, orderBy: { createdAt: "desc" } });
    expect(log.metadata).toMatchObject({
      section: "partners",
      op: "update",
      name: "chauffage lyonnais sarl, Villeurbanne, RGE",
      changed: ["name", "details", "criteria"],
      nameBefore: "Chauffage Lyonnais SARL",
      detailsBefore: "Lyon, RGE",
      criteriaBefore: { ...HYDRAULIC_HEAT_PUMP_PRESET, minHeatedArea: 80 },
      criteriaAfter: { ...HYDRAULIC_HEAT_PUMP_PRESET, minHeatedArea: 90 },
    });
    expect(JSON.stringify(log.metadata)).not.toMatch(/Durand|06 12|0612/);
  });

  it("journal de la désactivation et de la suppression : nom de l'entreprise conservé", async () => {
    await expectRedirect(savePartnerAction({}, presetForm("Thermo Nord")));
    const partner = await prisma.partner.findFirstOrThrow();
    await togglePartnerAction(form({ id: partner.id }));
    await expectRedirect(deletePartnerAction(form({ id: partner.id })));
    const logs = await prisma.auditLog.findMany({ where: { targetId: partner.id } });
    expect(logs).toHaveLength(3);
    expect(logs.map((l) => l.metadata)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: "create", name: "Thermo Nord", criteriaAfter: HYDRAULIC_HEAT_PUMP_PRESET }),
        expect.objectContaining({ op: "deactivate", name: "Thermo Nord", changed: ["active"] }),
        expect.objectContaining({ op: "delete", name: "Thermo Nord", criteriaBefore: HYDRAULIC_HEAT_PUMP_PRESET }),
      ]),
    );
  });

  it("transmission confirmée : fichier des demandes marquées, journal, refus pour une entreprise désactivée", async () => {
    await expectRedirect(savePartnerAction({}, presetForm("Chauffage Lyonnais", "Lyon, RGE")));
    const partner = await prisma.partner.findFirstOrThrow();
    const r = await namedRequest();

    expect((await transmitRequestedAction(partner.id, ["pas-un-identifiant"])).error).toMatch(/^Demande invalide/);
    await prisma.partner.update({ where: { id: partner.id }, data: { active: false } });
    expect((await transmitRequestedAction(partner.id, [r.id])).error).toMatch(/^Entreprise désactivée/);
    expect((await prisma.contactRequest.findUniqueOrThrow({ where: { id: r.id } })).requestedPartnerSentAt).toBeNull();
    await prisma.partner.update({ where: { id: partner.id }, data: { active: true } });

    const res = await transmitRequestedAction(partner.id, [r.id]);
    expect(res.error).toBeUndefined();
    expect([res.count, res.skipped]).toEqual([1, 0]);
    expect(res.filename).toMatch(/^demandes-chauffage-lyonnais-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(res.csv).toContain(r.reference);
    expect(await prisma.requestEvent.count({ where: { requestId: r.id, type: REQUESTED_PARTNER_SENT_EVENT, actorId: session.user.id } })).toBe(1);
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "EXPORT_CSV", targetId: partner.id } });
    expect(log.metadata).toEqual({ type: "demandes", op: "transmit", partner: "Chauffage Lyonnais, Lyon, RGE", requested: 1, transmitted: 1 });

    // Confirmation rejouée : plus rien à transmettre.
    const again = await transmitRequestedAction(partner.id, [r.id]);
    expect(again.error).toMatch(/^Aucune de ces demandes n'est plus à transmettre/);
    expect(again.csv).toBeUndefined();
  });
});
