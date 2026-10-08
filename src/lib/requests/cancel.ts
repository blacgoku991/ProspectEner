import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../db";
import { hashToken, safeEqual } from "../crypto";
import { REQUESTED_PARTNER_SENT_EVENT } from "../leads/requested-partner";
import { logger } from "../logger";
import { enqueueNotifications } from "../notifications/dispatch";
import { rateLimit } from "../ratelimit";
import { getSettings } from "../settings";
import type { SiteSettings } from "../settings-schema";
import { cancelPayloadSchema } from "../validation/request";
import { maskEmail, maskPhone } from "../validation/contact";
import { anonymizeRequest } from "./anonymize";

type Tx = Prisma.TransactionClient;

// ─── Entreprises qui ont déjà reçu la demande ───────────────────────────────

/** Événement de l'historique : récapitulatif du rendez-vous transmis à l'entreprise qui l'assure. */
export const APPOINTMENT_SENT_EVENT = "APPOINTMENT_SENT";
/** Événement de l'historique : entreprises à informer d'une annulation, d'une opposition ou d'un effacement. */
export const PARTNER_TO_INFORM_EVENT = "PARTNER_TO_INFORM";
/** Événement de l'historique : l'équipe a informé ces entreprises. */
export const PARTNER_INFORMED_EVENT = "PARTNER_INFORMED";

/** Ce qui a été reçu de la personne (données de l'événement PARTNER_TO_INFORM, avec les entreprises). */
export interface PartnerInformData {
  partners: string[];
  /** Demande annulée (par la personne ou par l'équipe à sa demande). */
  cancelled: boolean;
  /** Effacement des données demandé. */
  deleteData: boolean;
  /** Opposition à tout nouveau contact. */
  oppose: boolean;
  source: "VISITOR" | "STAFF";
}

/** Colonnes de la demande qui gardent la trace d'une transmission (Prisma `select`). */
export const SENT_TO_PARTNERS_SELECT = {
  requestedPartnerName: true,
  requestedPartnerSentAt: true,
  appointmentPartner: true,
  partnerSentAt: true,
} as const;

export interface SentToPartners {
  requestedPartnerName: string | null;
  requestedPartnerSentAt: Date | null;
  appointmentPartner: string | null;
  partnerSentAt: Date | null;
}

/**
 * Entreprises qui ont déjà reçu la demande : celle qu'elle nomme (export « demandes à transmettre »)
 * et celle d'un rendez-vous dont le récapitulatif a été transmis. L'historique fait foi en plus des
 * colonnes : un rendez-vous annulé puis confié à une autre entreprise ne fait pas oublier la première.
 */
export async function partnersAlreadySent(db: Tx | typeof prisma, requestId: string, r: SentToPartners): Promise<string[]> {
  const events = await db.requestEvent.findMany({
    where: { requestId, type: { in: [REQUESTED_PARTNER_SENT_EVENT, APPOINTMENT_SENT_EVENT] } },
    orderBy: { createdAt: "asc" },
    select: { data: true },
  });
  const names = [
    ...events.map((e) => (e.data as { partner?: unknown } | null)?.partner),
    r.requestedPartnerSentAt ? r.requestedPartnerName : null,
    r.partnerSentAt ? r.appointmentPartner : null,
  ].filter((n): n is string => typeof n === "string" && n.trim() !== "");
  return [...new Set(names)];
}

/**
 * La demande avait déjà été transmise à une ou plusieurs entreprises : l'équipe doit les informer
 * de l'annulation, de l'opposition ou de l'effacement (fin des appels ; art. 17 et 19 du RGPD). Dans
 * la transaction de l'annulation : date à traiter sur la demande, événement qui nomme les entreprises
 * et notification de l'équipe, envoyée même si les annulations ne sont pas notifiées.
 */
export async function requirePartnerInform(
  tx: Tx,
  requestId: string,
  info: Omit<PartnerInformData, "partners">,
  partners: string[],
  ctx: { actorId: string | null; settings: SiteSettings; now: Date },
): Promise<void> {
  if (partners.length === 0) return;
  await tx.contactRequest.update({ where: { id: requestId }, data: { partnerInformRequiredAt: ctx.now, partnerInformedAt: null } });
  const data: PartnerInformData = { partners, ...info };
  await tx.requestEvent.create({
    data: { requestId, actorId: ctx.actorId, type: PARTNER_TO_INFORM_EVENT, data: data as unknown as Prisma.InputJsonValue },
  });
  await enqueueNotifications(tx, requestId, "PARTNER_TO_INFORM", ctx.settings);
}

// ─── Annulation par la personne (lien personnel) ─────────────────────────────

export type CancelResult =
  | {
      ok: true;
      status: 200;
      requestId: string;
      reference: string;
      alreadyCancelled: boolean;
      /** Entreprises qui avaient déjà reçu la demande : l'équipe les informe de l'annulation. */
      partnersToInform: string[];
    }
  | { ok: false; status: 400 | 404 | 429; code: string; message: string };

const INVALID = { ok: false as const, status: 404 as const, code: "INVALID_LINK", message: "Ce lien d'annulation est invalide ou a expiré." };

export async function cancelContactRequest(raw: unknown, ctx: { ip: string | null }): Promise<CancelResult> {
  const rl = await rateLimit("cancel", ctx.ip ?? "unknown", 10, 600);
  if (!rl.allowed) return { ok: false, status: 429, code: "RATE_LIMITED", message: "Trop de tentatives. Merci de réessayer plus tard." };

  const parsed = cancelPayloadSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, status: 400, code: "INVALID_PAYLOAD", message: "Lien d'annulation incomplet." };
  const { reference, token, deleteData, oppose } = parsed.data;

  const req = await prisma.contactRequest.findUnique({
    where: { reference },
    select: {
      id: true,
      reference: true,
      status: true,
      cancelTokenHash: true,
      phone: true,
      email: true,
      phoneHash: true,
      emailHash: true,
      anonymizedAt: true,
      ...SENT_TO_PARTNERS_SELECT,
    },
  });
  if (!req || !req.cancelTokenHash || !safeEqual(req.cancelTokenHash, hashToken(token))) return INVALID;

  const alreadyCancelled = req.status === "CONTACT_ANNULE";
  const settings = await getSettings();
  const now = new Date();
  let partners: string[] = [];
  await prisma.$transaction(async (tx) => {
    partners = await partnersAlreadySent(tx, req.id, req);
    if (!alreadyCancelled) {
      await tx.contactRequest.update({
        where: { id: req.id },
        data: { status: "CONTACT_ANNULE", cancelledAt: now, cancelledBy: "VISITOR", closedAt: now, lastActivityAt: now },
      });
      await tx.requestEvent.create({ data: { requestId: req.id, type: "CANCELLED_BY_VISITOR", data: { deleteData, oppose } } });
      await enqueueNotifications(tx, req.id, "REQUEST_CANCELLED", settings);
    }
    let oppositionRecorded = false;
    if (oppose && (req.phoneHash || req.emailHash)) {
      const existing = await tx.opposition.findFirst({
        where: { OR: [...(req.phoneHash ? [{ phoneHash: req.phoneHash }] : []), ...(req.emailHash ? [{ emailHash: req.emailHash }] : [])] },
        select: { id: true },
      });
      if (!existing) {
        await tx.opposition.create({
          data: {
            phoneHash: req.phoneHash,
            emailHash: req.emailHash,
            maskedValue: req.phone ? maskPhone(req.phone) : req.email ? maskEmail(req.email) : "Contact anonymisé",
            source: "VISITOR_CANCELLATION",
            note: `Opposition exprimée lors de l'annulation de la demande ${req.reference}`,
            expiresAt: new Date(now.getTime() + settings.retention.oppositionMonths * 30.44 * 24 * 3600 * 1000),
          },
        });
        await tx.requestEvent.create({ data: { requestId: req.id, type: "OPPOSITION_RECORDED", data: { source: "VISITOR" } } });
        oppositionRecorded = true;
      }
    }
    const erased = deleteData && !req.anonymizedAt;
    if (erased) {
      await anonymizeRequest(tx, req.id, null, "Demande d'effacement lors de l'annulation");
    }
    // Demande déjà transmise : les entreprises qui l'ont reçue sont informées de ce qui est nouveau.
    if (!alreadyCancelled || erased || oppositionRecorded) {
      await requirePartnerInform(
        tx,
        req.id,
        { cancelled: !alreadyCancelled, deleteData: erased, oppose: oppositionRecorded, source: "VISITOR" },
        partners,
        { actorId: null, settings, now },
      );
    }
  });
  logger.info("request_cancelled", { reference: req.reference });
  return { ok: true, status: 200, requestId: req.id, reference: req.reference, alreadyCancelled, partnersToInform: partners };
}
