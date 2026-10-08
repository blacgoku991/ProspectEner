import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parisYear } from "@/lib/admin/requests";
import { type PartnerCriteria, partnerWhere } from "@/lib/leads/partners";
import { partnerDisplayName } from "@/lib/leads/partners-db";

export { parisYear };
export { requestedCounts } from "@/lib/leads/requested-partner";

/** Demandes non anonymisées qui correspondent aux critères, ou dont la correspondance reste à vérifier. */
export function matchingWhere(criteria: PartnerCriteria, year = parisYear()): Prisma.ContactRequestWhereInput {
  return { AND: [partnerWhere(criteria, year), { anonymizedAt: null }] };
}

/**
 * Rendez-vous confiés à l'entreprise, par son identifiant ; pour les rendez-vous enregistrés avant
 * l'identifiant, par le nom annoncé à la personne (dénomination seule, ou suivie des précisions).
 * Seules les demandes avec l'accord de la personne sont reprises ; jamais les demandes annulées,
 * anonymisées ou de démonstration.
 */
export function transmittedWhere(p: { id: string; name: string; details: string | null }): Prisma.ContactRequestWhereInput {
  return {
    OR: [{ appointmentPartnerId: p.id }, { appointmentPartnerId: null, appointmentPartner: { in: [...new Set([p.name, partnerDisplayName(p)])] } }],
    partnerConsentAt: { not: null },
    anonymizedAt: null,
    isDemo: false,
    status: { not: "CONTACT_ANNULE" },
  };
}

/**
 * Demandes qui nomment l'entreprise ou rendez-vous qui lui ont été confiés (quel que soit leur état) :
 * sa dénomination ne peut alors plus changer, la personne ayant lu ce nom.
 */
export async function partnerNameInUse(p: { id: string; name: string; details: string | null }): Promise<boolean> {
  const legacyNames = [...new Set([p.name, partnerDisplayName(p)])];
  const found = await prisma.contactRequest.findFirst({
    where: {
      OR: [{ requestedPartnerId: p.id }, { appointmentPartnerId: p.id }, { appointmentPartnerId: null, appointmentPartner: { in: legacyNames } }],
    },
    select: { id: true },
  });
  return found !== null;
}

/** Nouveau téléchargement (sans rien modifier) des demandes déjà transmises à l'entreprise. */
export const requestedRedownloadHref = (partnerId: string) => `/admin/partenaires/${partnerId}/export?type=demandes`;

/** Section de la fiche où l'équipe confirme la transmission des nouvelles demandes. */
export const transmitHref = (partnerId: string) => `/admin/partenaires/${partnerId}#transmettre`;
