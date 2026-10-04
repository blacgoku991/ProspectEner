/**
 * Données de DÉMONSTRATION — développement et recette uniquement.
 * Refusé en production et sans ALLOW_DEMO_DATA=true. Toutes les demandes créées sont
 * marquées `isDemo` et l'identité de l'entreprise est explicitement fictive.
 *
 * Usage : ALLOW_DEMO_DATA=true npm run db:demo [-- --reset]
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { DEFAULT_RULESET, evaluate, REFERENCE_SCENARIOS, resolveTerritory } from "../src/engine";
import type { Prisma } from "../src/generated/prisma/client";
import { addJoursOuvrables, parisToday } from "../src/lib/business-days";
import { hashEmail, hashPhone, hashToken, sha256Hex } from "../src/lib/crypto";
import { prisma } from "../src/lib/db";
import { env } from "../src/lib/env";
import { buildContactNotice, buildRequestSentence } from "../src/lib/legal/texts";
import { cancelTokenFor, generateReference } from "../src/lib/requests/reference";
import { worksTextForRequest } from "../src/lib/requests/shared";
import { ensureDefaultRuleSet } from "../src/lib/rulesets";
import { DEFAULT_SETTINGS, type SiteSettings } from "../src/lib/settings-schema";

const DEMO_SETTINGS: SiteSettings = {
  ...DEFAULT_SETTINGS,
  company: {
    ...DEFAULT_SETTINGS.company,
    name: "Entreprise Démo (fictive)",
    legalForm: "Société fictive de démonstration",
    address: "1 rue de l'Exemple, 00000 Démoville (adresse fictive)",
    email: "contact@example.invalid",
    privacyContact: "dpo@example.invalid",
  },
  activity: {
    ...DEFAULT_SETTINGS.activity,
    kinds: ["ACCOMPAGNEMENT"],
    description: "Texte de démonstration : remplacez-le par la présentation réelle de votre activité dans les paramètres.",
    qualifications: "",
    interventionArea: "",
  },
  contact: {
    ...DEFAULT_SETTINGS.contact,
    emailReplyEnabled: true,
    phoneCallbackEnabled: true,
    phoneCallbackReviewedAt: new Date().toISOString(),
    phoneCallbackReviewedBy: "script de démonstration",
  },
};

const PEOPLE = [
  ["Camille", "Martin"],
  ["Lucas", "Bernard"],
  ["Léa", "Dubois"],
  ["Hugo", "Thomas"],
  ["Chloé", "Robert"],
  ["Nathan", "Richard"],
  ["Manon", "Petit"],
  ["Louis", "Durand"],
] as const;

const STATUSES = ["NOUVEAU", "A_VERIFIER", "CONTACTE", "ETUDE_EN_COURS", "NOUVEAU", "TERMINE", "SANS_SUITE", "NOUVEAU"] as const;

async function main() {
  const { values } = parseArgs({ options: { reset: { type: "boolean", default: false } } });
  const e = env();
  if (e.NODE_ENV === "production" || !e.ALLOW_DEMO_DATA) {
    console.error("Refusé : données de démonstration interdites en production (ALLOW_DEMO_DATA=true requis hors production).");
    process.exit(1);
  }
  const ruleSet = await ensureDefaultRuleSet();
  if (values.reset) {
    const n = await prisma.contactRequest.deleteMany({ where: { isDemo: true } });
    console.log(`${n.count} demande(s) de démonstration supprimée(s).`);
  }
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, data: DEMO_SETTINGS as unknown as Prisma.InputJsonValue },
    update: { data: DEMO_SETTINGS as unknown as Prisma.InputJsonValue },
  });
  const noticeText = buildContactNotice(DEMO_SETTINGS);
  const notice = await prisma.textVersion.upsert({
    where: { hash: sha256Hex(noticeText) },
    create: { kind: "CONTACT_NOTICE", hash: sha256Hex(noticeText), content: noticeText },
    update: {},
  });
  const referenceDate = parisToday();
  let i = 0;
  for (const scenario of REFERENCE_SCENARIOS) {
    const [firstName, lastName] = PEOPLE[i % PEOPLE.length]!;
    const channel = i % 3 === 0 ? "EMAIL" : "PHONE";
    const createdAt = new Date(Date.now() - (i * 26 + 3) * 3600 * 1000);
    const evaluation = evaluate(scenario.answers, DEFAULT_RULESET, referenceDate);
    const { territory, departement } = resolveTerritory(scenario.answers);
    const phone = channel === "PHONE" ? `06000000${String(10 + i)}` : null;
    const email = channel === "EMAIL" ? `demo${i}@example.invalid` : null;
    const key = randomUUID();
    await prisma.contactRequest.create({
      data: {
        reference: generateReference(),
        idempotencyKey: key,
        payloadHash: sha256Hex(key),
        kind: "SIMULATION",
        status: STATUSES[i % STATUSES.length]!,
        isDemo: true,
        firstName,
        lastName,
        email,
        phone,
        channel,
        postalCode: scenario.answers.postalCode ?? null,
        communeName: scenario.answers.communeName ?? null,
        communeInsee: scenario.answers.communeInsee ?? null,
        departement,
        territory,
        answers: scenario.answers as unknown as Prisma.InputJsonValue,
        projectTypes: scenario.answers.works ?? [],
        evaluation: evaluation as unknown as Prisma.InputJsonValue,
        overallOutcome: evaluation.outcome,
        engineVersion: evaluation.engineVersion,
        ruleSetVersion: evaluation.ruleSetVersion,
        ruleSetId: ruleSet.id,
        evaluatedAt: createdAt,
        requestSentence: buildRequestSentence(DEMO_SETTINGS.company.name, channel, worksTextForRequest("SIMULATION", scenario.answers)),
        noticeTextId: notice.id,
        submittedAt: createdAt,
        createdAt,
        lastActivityAt: createdAt,
        phoneHash: phone ? hashPhone(phone) : null,
        emailHash: email ? hashEmail(email) : null,
        acquisitionOrigin: i % 2 === 0 ? "DIRECT" : "UNLISTED_CAMPAIGN",
        utmSource: i % 2 === 0 ? null : "demo",
        utmCampaign: i % 2 === 0 ? null : "demo-campagne",
        callbackDeadline: channel === "PHONE" ? addJoursOuvrables(createdAt, 5) : null,
        cancelTokenHash: hashToken(cancelTokenFor(key)),
        events: { create: { type: "CREATED", data: { kind: "SIMULATION", channel, demo: true }, createdAt } },
      },
    });
    i++;
  }
  console.log(`${i} demande(s) de démonstration créées (marquées « Démo ») et paramètres fictifs appliqués.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
