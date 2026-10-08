import "server-only";
import { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/** Réponses précises qui, croisées avec des données publiques (DPE), permettraient de retrouver le logement. */
const FINE_ANSWER_KEYS = ["postalCode", "communeInsee", "communeName", "heatedArea", "radiatorCount", "boilerLocation", "householdSize"] as const;

const decadeOf = (year: number) => Math.floor(year / 10) * 10;

/**
 * Année de construction ramenée à la décennie (une année exacte suffit, avec la surface et l'énergie,
 * à retrouver un logement dans les DPE publics). Les périodes du questionnaire sont déjà larges.
 */
export function coarseConstructionYears(min: number | null, max: number | null): { min: number | null; max: number | null } {
  if (min === null || max === null || max - min >= 9) return { min, max };
  return { min: decadeOf(min), max: decadeOf(max) + 9 };
}

/**
 * Anonymisation d'une demande : suppression des coordonnées, du texte libre, des notes internes,
 * de la localisation fine et des caractéristiques précises du logement (surface, radiateurs,
 * emplacement de la chaudière, taille du foyer, année exacte de construction). Restent : statistiques
 * non identifiantes (département, travaux, résultats, catégories) et, jusqu'à la fin de la durée de
 * preuve, les empreintes non réversibles de la preuve de la demande. Le nom des entreprises auxquelles
 * la demande a été transmise est conservé (ce n'est pas une donnée de la personne) : l'équipe doit
 * pouvoir les informer d'une annulation ou d'un effacement.
 */
export async function anonymizeRequest(tx: Tx, id: string, actorId: string | null, reason: string): Promise<void> {
  const req = await tx.contactRequest.findUnique({
    where: { id },
    select: { answers: true, anonymizedAt: true, constructionYearMin: true, constructionYearMax: true },
  });
  if (!req || req.anonymizedAt) return;
  const answers = { ...((req.answers as Record<string, unknown>) ?? {}) };
  for (const key of FINE_ANSWER_KEYS) delete answers[key];
  const construction = answers.construction as { kind?: string; year?: unknown } | undefined;
  if (construction?.kind === "YEAR" && typeof construction.year === "number") {
    const decade = decadeOf(construction.year);
    answers.construction = { kind: "PERIOD", from: decade, to: decade + 9 };
  }
  const years = coarseConstructionYears(req.constructionYearMin, req.constructionYearMax);
  await tx.contactRequest.update({
    where: { id },
    data: {
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
      streetAddress: null,
      comment: null,
      appointmentNote: null,
      availability: Prisma.DbNull,
      postalCode: null,
      communeName: null,
      communeInsee: null,
      answers: answers as Prisma.InputJsonValue,
      heatedArea: null,
      radiatorCount: null,
      boilerLocation: null,
      householdSize: null,
      constructionYearMin: years.min,
      constructionYearMax: years.max,
      userAgent: null,
      anonymizedAt: new Date(),
    },
  });
  await tx.internalNote.deleteMany({ where: { requestId: id } });
  await tx.requestEvent.create({ data: { requestId: id, actorId, type: "ANONYMIZED", data: { reason } } });
}

/** Fin de la durée de conservation de la preuve : suppression des empreintes. */
export async function purgeProof(tx: Tx, id: string): Promise<void> {
  await tx.contactRequest.update({
    where: { id },
    data: { phoneHash: null, emailHash: null, ipHash: null, cancelTokenHash: null, userAgent: null, proofPurgedAt: new Date() },
  });
}
