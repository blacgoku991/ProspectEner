import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parisYear } from "@/lib/admin/requests";
import { type PartnerCriteria, partnerWhere } from "@/lib/leads/partners";
import { partnerDisplayName } from "@/lib/leads/partners-db";
import { requestedPartnerWhere } from "@/lib/leads/requested-partner";

export { parisYear };

/** Demandes non anonymisées qui correspondent aux critères, ou dont la correspondance reste à vérifier. */
export function matchingWhere(criteria: PartnerCriteria, year = parisYear()): Prisma.ContactRequestWhereInput {
  return { AND: [partnerWhere(criteria, year), { anonymizedAt: null }] };
}

/**
 * Rendez-vous confiés à l'entreprise avec l'accord de la personne. Le nom enregistré sur la demande
 * est celui annoncé à la personne (dénomination seule, ou suivie des précisions). Les demandes
 * annulées par la personne, anonymisées ou de démonstration ne sont jamais reprises.
 */
export function transmittedWhere(p: { name: string; details: string | null }): Prisma.ContactRequestWhereInput {
  return {
    appointmentPartner: { in: [...new Set([p.name, partnerDisplayName(p)])] },
    partnerConsentAt: { not: null },
    anonymizedAt: null,
    isDemo: false,
    status: { not: "CONTACT_ANNULE" },
  };
}

/** Demandes qui nomment l'entreprise (transmissibles), et celles qui ne lui ont pas encore été transmises. */
export async function requestedCounts(partnerId: string): Promise<{ requested: number; pending: number }> {
  const [requested, pending] = await Promise.all([
    prisma.contactRequest.count({ where: requestedPartnerWhere(partnerId) }),
    prisma.contactRequest.count({ where: requestedPartnerWhere(partnerId, { pendingOnly: true }) }),
  ]);
  return { requested, pending };
}

/** Lien d'export des demandes qui nomment l'entreprise, pas encore transmises. */
export const requestedExportHref = (partnerId: string) => `/admin/partenaires/${partnerId}/export?type=demandes&nouvelles=1`;
