import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { type CsvColumn, toCsv } from "../csv";
import { prisma } from "../db";
import { CHANNEL_LONG_LABELS } from "../requests/shared";
import { LEAD_FIELD_COLUMNS, leadContactFields, leadProfileFields } from "./fields";
import { partnerDisplayName } from "./partners-db";
import { LEAD_PROFILE_SELECT, leadProfileFromRow } from "./profile";

/**
 * Demandes qui nomment une entreprise partenaire (phrase validée par la personne avant l'envoi) :
 * elles peuvent lui être transmises, à elle seule, sans autre accord.
 */

/** Type d'événement de l'historique : demande transmise à l'entreprise qu'elle nomme (nom de l'entreprise, aucune coordonnée). */
export const REQUESTED_PARTNER_SENT_EVENT = "REQUEST_SENT_TO_PARTNER";

/**
 * Demandes qui nomment l'entreprise et peuvent lui être transmises : ni anonymisées, ni annulées
 * (annulation par la personne ou opposition), ni de démonstration. `pendingOnly` : seulement
 * celles qui ne lui ont pas encore été transmises.
 */
export function requestedPartnerWhere(partnerId: string, opts: { pendingOnly?: boolean } = {}): Prisma.ContactRequestWhereInput {
  return {
    requestedPartnerId: partnerId,
    anonymizedAt: null,
    isDemo: false,
    status: { not: "CONTACT_ANNULE" },
    ...(opts.pendingOnly ? { requestedPartnerSentAt: null } : {}),
  };
}

/**
 * Enregistre la première transmission des demandes à l'entreprise nommée : date sur la demande et
 * événement dans son historique. Une demande déjà transmise n'est ni modifiée ni tracée à nouveau,
 * y compris lors de deux exports simultanés (mise à jour conditionnelle). Retourne le nombre de
 * demandes marquées.
 */
export async function markRequestedPartnerSent(ids: string[], partnerName: string, actorId: string | null, now = new Date()): Promise<number> {
  if (ids.length === 0) return 0;
  return prisma.$transaction(async (tx) => {
    await tx.contactRequest.updateMany({
      where: { id: { in: ids }, requestedPartnerSentAt: null },
      data: { requestedPartnerSentAt: now, lastActivityAt: now },
    });
    // Demandes marquées par cet export : celles qui portent exactement sa date (un export concurrent
    // attend le verrou de chaque ligne, puis ne la modifie plus).
    const marked = await tx.contactRequest.findMany({ where: { id: { in: ids }, requestedPartnerSentAt: now }, select: { id: true } });
    if (marked.length > 0) {
      await tx.requestEvent.createMany({
        data: marked.map((r) => ({ requestId: r.id, actorId, type: REQUESTED_PARTNER_SENT_EVENT, data: { partner: partnerName }, createdAt: now })),
      });
    }
    return marked.length;
  });
}

const parisDateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });
const parisDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "Europe/Paris" });

export interface RequestedLeadsExport {
  csv: string;
  /** Lignes exportées. */
  count: number;
  /** Demandes transmises pour la première fois par cet export. */
  newlySent: number;
}

/**
 * Export CSV des demandes qui nomment l'entreprise : référence, date, échéance de rappel (le délai
 * court à partir de la demande, pas de sa transmission), canal demandé, phrase validée par la
 * personne (preuve de la demande), puis la fiche (coordonnées et réponses). La transmission est
 * ensuite enregistrée sur les demandes qui ne l'avaient pas encore été.
 */
export async function exportRequestedLeads(opts: {
  partner: { id: string; name: string; details: string | null };
  /** Périmètre de la personne qui exporte (requestScope). */
  scope: Prisma.ContactRequestWhereInput;
  /** Seulement les demandes pas encore transmises. */
  pendingOnly: boolean;
  actorId: string | null;
  now?: Date;
}): Promise<RequestedLeadsExport> {
  const rows = await prisma.contactRequest.findMany({
    where: { AND: [opts.scope, requestedPartnerWhere(opts.partner.id, { pendingOnly: opts.pendingOnly })] },
    orderBy: [{ createdAt: "asc" }],
    take: 10_000,
    select: {
      id: true,
      reference: true,
      createdAt: true,
      callbackDeadline: true,
      channel: true,
      requestSentence: true,
      requestedPartnerSentAt: true,
      firstName: true,
      lastName: true,
      streetAddress: true,
      postalCode: true,
      communeName: true,
      phone: true,
      email: true,
      ...LEAD_PROFILE_SELECT,
    },
  });
  const lines = rows.map((r) => {
    const fields = [...leadContactFields(r), ...leadProfileFields(leadProfileFromRow(r))];
    return { r, values: new Map(fields.map((f) => [f.key, f.value])) };
  });
  type Line = (typeof lines)[number];
  const columns: CsvColumn<Line>[] = [
    { header: "Référence", value: ({ r }) => r.reference },
    { header: "Date de la demande", value: ({ r }) => parisDateTime.format(r.createdAt) },
    { header: "À rappeler avant le", value: ({ r }) => (r.callbackDeadline ? parisDate.format(r.callbackDeadline) : "") },
    { header: "Canal demandé", value: ({ r }) => CHANNEL_LONG_LABELS[r.channel] },
    { header: "Phrase de la demande", value: ({ r }) => r.requestSentence },
    ...LEAD_FIELD_COLUMNS.map((f): CsvColumn<Line> => ({ header: f.label, value: ({ values }) => values.get(f.key) ?? "" })),
  ];
  const csv = toCsv(lines, columns);
  const newlySent = await markRequestedPartnerSent(
    rows.filter((r) => r.requestedPartnerSentAt === null).map((r) => r.id),
    partnerDisplayName(opts.partner),
    opts.actorId,
    opts.now,
  );
  return { csv, count: rows.length, newlySent };
}
