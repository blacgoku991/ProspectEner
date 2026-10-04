/**
 * Crée un compte de l'équipe et affiche un lien d'activation à usage unique (72 h).
 * Aucun mot de passe n'est transmis : la personne choisit le sien puis active la double authentification.
 *
 * Usage : npm run admin:create -- --email prenom.nom@exemple.fr --name "Prénom Nom" [--role ADMIN|COLLABORATOR] [--reset]
 */
import "dotenv/config";
import { parseArgs } from "node:util";
import { prisma } from "../src/lib/db";
import { env } from "../src/lib/env";
import { hashToken, randomToken } from "../src/lib/crypto";

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      role: { type: "string", default: "ADMIN" },
      reset: { type: "boolean", default: false },
    },
  });
  const email = values.email?.trim().toLowerCase();
  const name = values.name?.trim();
  const role = values.role === "COLLABORATOR" ? "COLLABORATOR" : "ADMIN";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) {
    console.error('Usage : npm run admin:create -- --email prenom.nom@exemple.fr --name "Prénom Nom" [--role ADMIN|COLLABORATOR] [--reset]');
    process.exit(1);
  }
  const token = randomToken(32);
  const data = { setupTokenHash: hashToken(token), setupTokenExpiresAt: new Date(Date.now() + 72 * 3600 * 1000) };
  const existing = await prisma.staffUser.findUnique({ where: { email } });
  if (existing && !values.reset) {
    console.error("Ce compte existe déjà. Ajoutez --reset pour générer un nouveau lien d'activation (le mot de passe et la double authentification seront réinitialisés).");
    process.exit(1);
  }
  const user = existing
    ? await prisma.staffUser.update({
        where: { email },
        data: { ...data, passwordHash: null, mfaSecretEnc: null, mfaEnabledAt: null, recoveryCodeHashes: [], failedLoginCount: 0, lockedUntil: null },
      })
    : await prisma.staffUser.create({ data: { email, displayName: name, role, ...data } });
  await prisma.staffSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await prisma.auditLog.create({ data: { action: existing ? "USER_SETUP_LINK" : "USER_CREATED", actorLabel: "cli", targetType: "StaffUser", targetId: user.id, metadata: { role, via: "cli" } } });
  const url = `${env().APP_URL.replace(/\/$/, "")}/admin/activation#token=${token}`;
  console.log(`\nCompte ${existing ? "réinitialisé" : "créé"} : ${email} (${role})`);
  console.log(`Lien d'activation (valable 72 h, à usage unique) :\n${url}\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
