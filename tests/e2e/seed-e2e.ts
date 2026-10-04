/**
 * Prépare la base de bout en bout : réinitialisation, barème, paramètres de test,
 * un administrateur et un collaborateur avec double authentification connue des tests.
 * Exécuté par la configuration globale Playwright (tsx --conditions=react-server).
 */
import { hashPassword } from "../../src/lib/auth/password";
import { encrypt } from "../../src/lib/crypto";
import { prisma } from "../../src/lib/db";
import { ensureDefaultRuleSet } from "../../src/lib/rulesets";
import { DEFAULT_SETTINGS, type SiteSettings } from "../../src/lib/settings-schema";
import { ADMIN, COLLAB } from "./config";

const SETTINGS: SiteSettings = {
  ...DEFAULT_SETTINGS,
  company: {
    ...DEFAULT_SETTINGS.company,
    name: "Rénovation Test E2E",
    address: "10 avenue des Tests, 69000 Lyon",
    email: "contact@e2e.invalid",
    privacyContact: "dpo@e2e.invalid",
    phone: "04 00 00 00 00",
  },
  contact: { ...DEFAULT_SETTINGS.contact, emailReplyEnabled: true, phoneCallbackEnabled: true, phoneCallbackReviewedAt: new Date().toISOString(), phoneCallbackReviewedBy: "e2e" },
};

async function main() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Notification", "RequestEvent", "InternalNote", "ContactRequest", "TextVersion", "Opposition", "AcquisitionChannel", "AuditLog", "RateLimitBucket", "FunnelDailyStat", "StaffSession", "StaffUser", "SiteSettings", "RuleSet" RESTART IDENTITY CASCADE',
  );
  await ensureDefaultRuleSet();
  await prisma.siteSettings.create({ data: { id: 1, data: SETTINGS } });
  for (const [u, role, name] of [[ADMIN, "ADMIN", "Admin E2E"], [COLLAB, "COLLABORATOR", "Collab E2E"]] as const) {
    await prisma.staffUser.create({
      data: {
        email: u.email,
        displayName: name,
        role,
        passwordHash: await hashPassword(u.password),
        passwordChangedAt: new Date(),
        mfaSecretEnc: encrypt(u.totpSecret),
        mfaEnabledAt: new Date(),
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
