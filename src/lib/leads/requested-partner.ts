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
 * elles peuvent lui être transmises, à elle seule, sans autre accord, tant qu'elles restent
 * transmissibles (demande ouverte et vérifiée, aucune opposition, rappel encore dans le délai).
 */

/** Type d'événement de l'historique : demande transmise à l'entreprise qu'elle nomme (nom de l'entreprise, aucune coordonnée). */
export const REQUESTED_PARTNER_SENT_EVENT = "REQUEST_SENT_TO_PARTNER";

/**
 * Statuts d'une demande transmissible : ouverte et vérifiée. « À vérifier » (contact présent dans la
 * liste d'opposition, par exemple) attend qu'une personne de l'équipe lève le doute ; « Terminé »,
 * « Sans suite » et « Contact annulé » sont clos.
 */
export const TRANSMISSIBLE_STATUSES = ["NOUVEAU", "CONTACTE", "RDV_FIXE", "ETUDE_EN_COURS"] as const;

type Db = Prisma.TransactionClient | typeof prisma;

/** Lignes au plus par export (comme l'export des demandes). */
const MAX_ROWS = 10_000;

export interface RequestedPartnerRef {
  id: string;
  name: string;
  details: string | null;
}

/** Toutes les demandes qui nomment l'entreprise, hors anonymisées et de démonstration (compteurs). */
export function namingWhere(partnerId: string): Prisma.ContactRequestWhereInput {
  return { requestedPartnerId: partnerId, anonymizedAt: null, isDemo: false };
}

/**
 * Demandes qui nomment l'entreprise et peuvent lui être transmises à l'instant `now` :
 * - ni anonymisées, ni de démonstration ;
 * - ouvertes et vérifiées (TRANSMISSIBLE_STATUSES) ;
 * - contact absent de la liste d'opposition lors de la demande (`oppositionMatch`) ;
 * - réponse par e-mail, ou rappel téléphonique encore dans le délai : le délai de l'art. R223-4
 *   court depuis la demande, pas depuis la transmission (« rappel dans le délai ou pas du tout ») ;
 * - aucun rendez-vous confié à une autre entreprise.
 * Les oppositions enregistrées après la demande (aucune relation en base) sont écartées par
 * `excludeIds` : voir transmissibleWhere, qui les ajoute.
 * `pendingOnly` : pas encore transmises ; `sentOnly` : déjà transmises.
 */
export function requestedPartnerWhere(
  partnerId: string,
  opts: { now: Date; pendingOnly?: boolean; sentOnly?: boolean; excludeIds?: string[] },
): Prisma.ContactRequestWhereInput {
  return {
    ...namingWhere(partnerId),
    status: { in: [...TRANSMISSIBLE_STATUSES] },
    oppositionMatch: false,
    AND: [
      { OR: [{ channel: "EMAIL" }, { callbackDeadline: { gte: opts.now } }] },
      { OR: [{ appointmentPartnerId: null, appointmentPartner: null }, { appointmentPartnerId: partnerId }] },
    ],
    ...(opts.pendingOnly ? { requestedPartnerSentAt: null } : opts.sentOnly ? { requestedPartnerSentAt: { not: null } } : {}),
    ...(opts.excludeIds?.length ? { id: { notIn: opts.excludeIds } } : {}),
  };
}

/**
 * Demandes qui nomment l'entreprise dont le téléphone ou l'e-mail figure dans la liste d'opposition,
 * opposition en cours à `now` (sans échéance, ou échéance future), quelle que soit sa date.
 */
export async function opposedRequestIds(db: Db, partnerId: string, now: Date): Promise<string[]> {
  // Comparaison en UTC explicite : les dates Prisma sont stockées sans fuseau, en UTC.
  const at = now.toISOString();
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT r."id"::text AS "id"
    FROM "ContactRequest" r
    WHERE r."requestedPartnerId" = ${partnerId}::uuid
      AND r."anonymizedAt" IS NULL
      AND EXISTS (
        SELECT 1 FROM "Opposition" o
        WHERE (o."expiresAt" IS NULL OR o."expiresAt" > (${at}::timestamptz AT TIME ZONE 'UTC'))
          AND ((r."phoneHash" IS NOT NULL AND o."phoneHash" = r."phoneHash") OR (r."emailHash" IS NOT NULL AND o."emailHash" = r."emailHash"))
      )`;
  return rows.map((r) => r.id);
}

/** Filtre complet des demandes transmissibles, liste d'opposition à jour comprise. */
export async function transmissibleWhere(
  db: Db,
  partnerId: string,
  opts: { now: Date; pendingOnly?: boolean; sentOnly?: boolean },
): Promise<Prisma.ContactRequestWhereInput> {
  return requestedPartnerWhere(partnerId, { ...opts, excludeIds: await opposedRequestIds(db, partnerId, opts.now) });
}

export interface RequestedCounts {
  /** Toutes les demandes qui nomment l'entreprise (hors anonymisées et de démonstration). */
  requested: number;
  /** Pas encore transmises et transmissibles. */
  pending: number;
  /** Pas encore transmises et non transmissibles : délai de rappel dépassé, demande close ou à vérifier, opposition. */
  blocked: number;
  /** Déjà transmises. */
  sent: number;
  /** Déjà transmises et toujours transmissibles : téléchargeables à nouveau. */
  resendable: number;
}

/** Compteurs de la page Partenaires, avec les mêmes filtres que les exports. */
export async function requestedCounts(partnerId: string, now = new Date()): Promise<RequestedCounts> {
  const excludeIds = await opposedRequestIds(prisma, partnerId, now);
  const [unsent, sent, pending, resendable] = await Promise.all([
    prisma.contactRequest.count({ where: { ...namingWhere(partnerId), requestedPartnerSentAt: null } }),
    prisma.contactRequest.count({ where: { ...namingWhere(partnerId), requestedPartnerSentAt: { not: null } } }),
    prisma.contactRequest.count({ where: requestedPartnerWhere(partnerId, { now, pendingOnly: true, excludeIds }) }),
    prisma.contactRequest.count({ where: requestedPartnerWhere(partnerId, { now, sentOnly: true, excludeIds }) }),
  ]);
  return { requested: unsent + sent, pending, blocked: unsent - pending, sent, resendable };
}

/**
 * Demandes à transmettre, présentées à l'équipe avant la confirmation : identifiants (aucune
 * coordonnée) et nombre de demandes qui nomment l'entreprise sous un autre nom que son nom actuel.
 */
export async function pendingRequestedLeads(partner: RequestedPartnerRef, now = new Date()): Promise<{ ids: string[]; otherName: number }> {
  const rows = await prisma.contactRequest.findMany({
    where: await transmissibleWhere(prisma, partner.id, { now, pendingOnly: true }),
    orderBy: [{ createdAt: "asc" }],
    take: MAX_ROWS,
    select: { id: true, requestedPartnerName: true },
  });
  const current = partnerDisplayName(partner);
  return { ids: rows.map((r) => r.id), otherName: rows.filter((r) => r.requestedPartnerName !== current).length };
}

const EXPORT_SELECT = {
  id: true,
  reference: true,
  createdAt: true,
  callbackDeadline: true,
  channel: true,
  requestSentence: true,
  requestedPartnerName: true,
  firstName: true,
  lastName: true,
  streetAddress: true,
  postalCode: true,
  communeName: true,
  phone: true,
  email: true,
  ...LEAD_PROFILE_SELECT,
} as const satisfies Prisma.ContactRequestSelect;

type ExportRow = Prisma.ContactRequestGetPayload<{ select: typeof EXPORT_SELECT }>;

/**
 * Enregistre la première transmission des demandes `ids` à l'entreprise qu'elles nomment : date sur
 * la demande et événement dans son historique. Le filtre des demandes transmissibles est appliqué à
 * nouveau dans la mise à jour (statut, anonymisation, opposition, délai de rappel) : une demande
 * annulée, anonymisée ou close depuis l'affichage n'est ni marquée ni exportée. Une demande déjà
 * transmise n'est ni modifiée ni tracée à nouveau, y compris lors de deux transmissions simultanées
 * (mise à jour conditionnelle : seules les lignes modifiées par cette requête sont retournées).
 */
async function markSent(tx: Prisma.TransactionClient, partner: RequestedPartnerRef, ids: string[], actorId: string | null, now: Date): Promise<ExportRow[]> {
  if (ids.length === 0) return [];
  const where = await transmissibleWhere(tx, partner.id, { now, pendingOnly: true });
  const rows = await tx.contactRequest.updateManyAndReturn({
    where: { AND: [where, { id: { in: ids } }] },
    data: { requestedPartnerSentAt: now, lastActivityAt: now },
    select: EXPORT_SELECT,
  });
  if (rows.length > 0) {
    const name = partnerDisplayName(partner);
    await tx.requestEvent.createMany({
      data: rows.map((r) => ({ requestId: r.id, actorId, type: REQUESTED_PARTNER_SENT_EVENT, data: { partner: name }, createdAt: now })),
    });
  }
  return rows;
}

/** Marque les demandes comme transmises (voir markSent) ; retourne les identifiants effectivement marqués. */
export async function markRequestedPartnerSent(partner: RequestedPartnerRef, ids: string[], actorId: string | null, now = new Date()): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.$transaction((tx) => markSent(tx, partner, ids, actorId, now));
  return rows.map((r) => r.id);
}

const parisDateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });
const parisDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "Europe/Paris" });

/** Rappel des conditions d'usage, dernière colonne de chaque ligne transmise à l'entreprise. */
export const USAGE_TERMS = {
  PHONE:
    "Rappel par téléphone avant la date indiquée, uniquement au sujet du projet demandé ; aucune autre sollicitation, aucun SMS ni e-mail commercial, aucune cession à un tiers.",
  EMAIL: "Réponse par e-mail uniquement, au sujet du projet demandé ; aucun appel, aucune autre sollicitation, aucune cession à un tiers.",
  APPOINTMENT:
    "Uniquement pour le rendez-vous et le projet indiqués ; aucune autre sollicitation, aucun SMS ni e-mail commercial, aucune cession à un tiers.",
} as const;

export const USAGE_TERMS_HEADER = "Conditions d'usage";

/**
 * CSV des demandes : référence, date, échéance de rappel (le délai court à partir de la demande,
 * pas de sa transmission), canal demandé, phrase validée par la personne (preuve de la demande),
 * repère si l'entreprise y est nommée sous un autre nom que son nom actuel, puis la fiche
 * (coordonnées et réponses) et les conditions d'usage.
 */
function requestedLeadsCsv(rows: ExportRow[], partner: RequestedPartnerRef): string {
  const current = partnerDisplayName(partner);
  const lines = [...rows]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((r) => {
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
    { header: "Nom à la demande ≠ nom actuel", value: ({ r }) => (r.requestedPartnerName !== null && r.requestedPartnerName !== current ? "Oui" : "Non") },
    ...LEAD_FIELD_COLUMNS.map((f): CsvColumn<Line> => ({ header: f.label, value: ({ values }) => values.get(f.key) ?? "" })),
    { header: USAGE_TERMS_HEADER, value: ({ r }) => USAGE_TERMS[r.channel] },
  ];
  return toCsv(lines, columns);
}

export interface RequestedLeadsExport {
  csv: string;
  /** Lignes exportées. */
  count: number;
}

/**
 * Transmission confirmée par l'équipe : les demandes `ids` (celles présentées avant la
 * confirmation) encore transmissibles et pas encore transmises sont marquées comme transmises,
 * puis exportées. Le fichier ne contient que les demandes effectivement marquées par cette
 * transmission.
 */
export async function transmitRequestedLeads(opts: {
  partner: RequestedPartnerRef;
  ids: string[];
  actorId: string | null;
  now?: Date;
}): Promise<RequestedLeadsExport> {
  const now = opts.now ?? new Date();
  const ids = [...new Set(opts.ids)].slice(0, MAX_ROWS);
  const rows = ids.length ? await prisma.$transaction((tx) => markSent(tx, opts.partner, ids, opts.actorId, now)) : [];
  return { csv: requestedLeadsCsv(rows, opts.partner), count: rows.length };
}

/**
 * Nouveau téléchargement, sans rien modifier : demandes déjà transmises à l'entreprise et toujours
 * transmissibles (un fichier perdu peut être récupéré ; une demande close, en opposition ou dont
 * le délai de rappel est dépassé n'est plus jamais remise).
 */
export async function exportRequestedLeads(opts: { partner: RequestedPartnerRef; now?: Date }): Promise<RequestedLeadsExport> {
  const now = opts.now ?? new Date();
  const rows = await prisma.contactRequest.findMany({
    where: await transmissibleWhere(prisma, opts.partner.id, { now, sentOnly: true }),
    orderBy: [{ createdAt: "asc" }],
    take: MAX_ROWS,
    select: EXPORT_SELECT,
  });
  return { csv: requestedLeadsCsv(rows, opts.partner), count: rows.length };
}
