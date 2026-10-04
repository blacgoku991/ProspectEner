import "server-only";
import { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Anonymisation d'une demande : suppression des coordonnées, du texte libre, des notes
 * internes et de la localisation fine. Restent : statistiques non identifiantes
 * (département, travaux, résultats) et, jusqu'à la fin de la durée de preuve,
 * les empreintes non réversibles de la preuve de la demande.
 */
export async function anonymizeRequest(tx: Tx, id: string, actorId: string | null, reason: string): Promise<void> {
  const req = await tx.contactRequest.findUnique({ where: { id }, select: { answers: true, anonymizedAt: true } });
  if (!req || req.anonymizedAt) return;
  const answers = { ...((req.answers as Record<string, unknown>) ?? {}) };
  delete answers.postalCode;
  delete answers.communeInsee;
  delete answers.communeName;
  await tx.contactRequest.update({
    where: { id },
    data: {
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
      comment: null,
      availability: Prisma.DbNull,
      postalCode: null,
      communeName: null,
      communeInsee: null,
      answers: answers as Prisma.InputJsonValue,
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
