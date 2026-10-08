import { randomUUID } from "node:crypto";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/settings-schema";
import type { Answers } from "@/engine";

export const ANSWERS_ELIGIBLE: Answers = {
  postalCode: "69003",
  communeInsee: "69383",
  communeName: "Lyon 3e Arrondissement",
  housingType: "MAISON",
  occupancy: "PROPRIETAIRE_OCCUPANT",
  residence: "PRINCIPALE",
  construction: { kind: "YEAR", year: 1985 },
  works: ["PAC"],
  heatPumpType: "PAC_AIR_EAU",
  currentHeating: "CHAUDIERE_FIOUL",
  // Installation actuelle (chauffage central à eau) : questions posées pour un projet de chauffage.
  heatEmitters: "RADIATEURS_FONTE",
  radiatorCount: 9,
  heatedArea: 120,
  boilerLocation: "GARAGE",
  oilTankRemoval: "NON",
  quoteSigned: "NON",
  worksStarted: "NON",
  priorAidStatus: "NON",
  contractor: "NON_CHOISIE",
  householdSize: 3,
  income: "MODESTE",
};

export const TEST_SETTINGS: SiteSettings = {
  ...DEFAULT_SETTINGS,
  company: {
    ...DEFAULT_SETTINGS.company,
    name: "Entreprise Test",
    address: "1 rue du Test, 69000 Lyon",
    email: "contact@test.invalid",
    privacyContact: "dpo@test.invalid",
  },
  contact: {
    ...DEFAULT_SETTINGS.contact,
    emailReplyEnabled: true,
    phoneCallbackEnabled: true,
    phoneCallbackReviewedAt: "2026-10-01T10:00:00.000Z",
    phoneCallbackReviewedBy: "test",
  },
  notifications: { emailRecipients: ["equipe@test.invalid"], webhookUrl: "https://hooks.test.invalid/new", notifyOnCancellation: true },
};

export async function resetDatabase(): Promise<void> {
  const { prisma } = await import("@/lib/db");
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Notification", "RequestEvent", "InternalNote", "ContactRequest", "TextVersion", "Opposition", "AcquisitionChannel", "AuditLog", "RateLimitBucket", "FunnelDailyStat", "StaffSession", "StaffUser", "SiteSettings", "RuleSet", "Partner" RESTART IDENTITY CASCADE',
  );
}

export async function configure(settings: SiteSettings = TEST_SETTINGS) {
  const { saveSettings } = await import("@/lib/settings");
  const { ensureDefaultRuleSet } = await import("@/lib/rulesets");
  await saveSettings(settings, null);
  return ensureDefaultRuleSet();
}

export async function simulationPayload(overrides: Record<string, unknown> = {}, contact: Record<string, unknown> = {}) {
  const { noticeWithHash } = await import("@/lib/legal/notice");
  const { getSettings } = await import("@/lib/settings");
  const { parisToday } = await import("@/lib/business-days");
  const { DEFAULT_RULESET } = await import("@/engine");
  const settings = await getSettings();
  return {
    kind: "SIMULATION",
    idempotencyKey: randomUUID(),
    answers: ANSWERS_ELIGIBLE,
    ruleSetVersion: DEFAULT_RULESET.version,
    referenceDate: parisToday(),
    contact: { firstName: "Camille", lastName: "Durand", channel: "PHONE", phone: "06 12 34 56 78", email: "", confirmRequest: true, ...contact },
    noticeHash: noticeWithHash(settings).hash,
    formElapsedMs: 15000,
    ...overrides,
  };
}

let ipCounter = 0;
/** Adresse IP distincte par appel, pour ne pas déclencher la limitation de débit entre tests. */
export function freshIp(): string {
  ipCounter++;
  return `203.0.113.${ipCounter % 250}`;
}
