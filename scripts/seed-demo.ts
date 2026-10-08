/**
 * Données de DÉMONSTRATION — développement et recette uniquement.
 * Refusé en production et sans ALLOW_DEMO_DATA=true. Toutes les demandes créées sont
 * marquées `isDemo` ; l'identité de l'entreprise et celle des entreprises partenaires
 * (mise en relation) sont explicitement fictives.
 *
 * Usage : ALLOW_DEMO_DATA=true npm run db:demo [-- --reset]
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { type Answers, DEFAULT_RULESET, evaluate, pruneAnswers, REFERENCE_SCENARIOS, resolveTerritory } from "../src/engine";
import type { IncomeCategory } from "../src/engine/types";
import type { Prisma } from "../src/generated/prisma/client";
import { addJoursOuvrables, parisToday } from "../src/lib/business-days";
import { hashEmail, hashPhone, hashToken, sha256Hex } from "../src/lib/crypto";
import { prisma } from "../src/lib/db";
import { env } from "../src/lib/env";
import { HYDRAULIC_HEAT_PUMP_PRESET, type PartnerCriteria, partnerCriteriaSchema } from "../src/lib/leads/partners";
import { leadProfileColumns, leadProfileFromAnswers } from "../src/lib/leads/profile";
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
    // Mise en relation déclarée : les entreprises partenaires fictives ci-dessous peuvent recevoir des rendez-vous de démonstration.
    kinds: ["ACCOMPAGNEMENT", "MISE_EN_RELATION"],
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

/** Entreprises partenaires fictives (le modèle ne porte pas d'indicateur « démo » : noms explicitement fictifs). */
const DEMO_PARTNERS: { name: string; details: string; criteria: PartnerCriteria }[] = [
  { name: "Chauffage Démo (entreprise fictive)", details: "Démoville, RGE — données de démonstration", criteria: HYDRAULIC_HEAT_PUMP_PRESET },
  {
    name: "Isolation Démo (entreprise fictive)",
    details: "Démoville — données de démonstration",
    criteria: partnerCriteriaSchema.parse({
      works: ["ISOLATION_COMBLES_TOITURE", "ISOLATION_MURS", "ISOLATION_PLANCHER_BAS", "MENUISERIES"],
      occupancies: ["PROPRIETAIRE_OCCUPANT", "PROPRIETAIRE_BAILLEUR"],
      departements: ["69", "75"],
    }),
  },
];

/** Installation actuelle fictive (chauffage central à eau) ; seules les questions effectivement posées sont conservées. */
const HYDRAULIC_INSTALLATIONS: Partial<Answers>[] = [
  { heatEmitters: "RADIATEURS_FONTE", radiatorCount: 9, heatedArea: 120, boilerLocation: "GARAGE" },
  { heatEmitters: "RADIATEURS_ACIER_ALU", radiatorCount: 7, heatedArea: 95, boilerLocation: "CAVE_SOUS_SOL" },
  { heatEmitters: "PLANCHER_CHAUFFANT_EAU", heatedArea: 140, boilerLocation: "BUANDERIE_CELLIER" },
  { heatEmitters: "RADIATEURS_FONTE", radiatorCount: "INCONNU", heatedArea: "INCONNU", boilerLocation: "CUISINE" },
];

function demoInstallation(answers: Answers, i: number): Partial<Answers> {
  if (answers.currentHeating === "ELECTRIQUE") return { heatEmitters: "RADIATEURS_ELECTRIQUES", heatedArea: 65 + 5 * i };
  return { gasBoilerCondensing: "NON", ...HYDRAULIC_INSTALLATIONS[i % HYDRAULIC_INSTALLATIONS.length] };
}

/** Variété des catégories de revenus (bleu, jaune, violet, rose) dans la liste de démonstration. */
const DEMO_INCOMES: Partial<Record<string, IncomeCategory>> = { "pac-fioul-cuve": "TRES_MODESTE", vmc: "INTERMEDIAIRE" };

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
  for (const p of DEMO_PARTNERS) {
    const data = { details: p.details, active: true, criteria: p.criteria as unknown as Prisma.InputJsonValue };
    await prisma.partner.upsert({ where: { name: p.name }, create: { name: p.name, ...data }, update: data });
  }
  const noticeText = buildContactNotice(DEMO_SETTINGS);
  const notice = await prisma.textVersion.upsert({
    where: { hash: sha256Hex(noticeText) },
    create: { kind: "CONTACT_NOTICE", hash: sha256Hex(noticeText), content: noticeText },
    update: {},
  });
  const referenceDate = parisToday();
  let i = 0;
  const qctx = { rules: DEFAULT_RULESET.data, referenceDate };
  for (const scenario of REFERENCE_SCENARIOS) {
    const [firstName, lastName] = PEOPLE[i % PEOPLE.length]!;
    const channel = i % 3 === 0 ? "EMAIL" : "PHONE";
    const createdAt = new Date(Date.now() - (i * 26 + 3) * 3600 * 1000);
    const income = DEMO_INCOMES[scenario.id] ?? scenario.answers.income;
    const answers = pruneAnswers({ ...scenario.answers, ...demoInstallation(scenario.answers, i), income }, qctx);
    const evaluation = evaluate(answers, DEFAULT_RULESET, referenceDate);
    const { territory, departement } = resolveTerritory(answers);
    const phone = channel === "PHONE" ? `06000000${String(10 + i)}` : null;
    // E-mail obligatoire pour une réponse par e-mail, parfois donné en plus avec un rappel ; adresse du logement facultative.
    const email = channel === "EMAIL" || i % 3 === 1 ? `demo${i}@example.invalid` : null;
    const streetAddress = i % 2 === 0 ? `${10 + i} rue de l'Exemple (adresse fictive)` : null;
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
        streetAddress,
        channel,
        postalCode: answers.postalCode ?? null,
        communeName: answers.communeName ?? null,
        communeInsee: answers.communeInsee ?? null,
        departement,
        territory,
        answers: answers as unknown as Prisma.InputJsonValue,
        projectTypes: answers.works ?? [],
        ...leadProfileColumns(leadProfileFromAnswers(answers, departement)),
        evaluation: evaluation as unknown as Prisma.InputJsonValue,
        overallOutcome: evaluation.outcome,
        engineVersion: evaluation.engineVersion,
        ruleSetVersion: evaluation.ruleSetVersion,
        ruleSetId: ruleSet.id,
        evaluatedAt: createdAt,
        requestSentence: buildRequestSentence(DEMO_SETTINGS.company.name, channel, worksTextForRequest("SIMULATION", answers)),
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
  console.log(
    `${i} demande(s) de démonstration créées (marquées « Démo »), ${DEMO_PARTNERS.length} entreprises partenaires fictives et paramètres fictifs appliqués.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
