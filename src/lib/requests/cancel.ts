import "server-only";
import { prisma } from "../db";
import { hashToken, safeEqual } from "../crypto";
import { logger } from "../logger";
import { enqueueNotifications } from "../notifications/dispatch";
import { rateLimit } from "../ratelimit";
import { getSettings } from "../settings";
import { cancelPayloadSchema } from "../validation/request";
import { maskEmail, maskPhone } from "../validation/contact";
import { anonymizeRequest } from "./anonymize";

export type CancelResult =
  | { ok: true; status: 200; requestId: string; reference: string; alreadyCancelled: boolean }
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
    select: { id: true, reference: true, status: true, cancelTokenHash: true, phone: true, email: true, phoneHash: true, emailHash: true, anonymizedAt: true },
  });
  if (!req || !req.cancelTokenHash || !safeEqual(req.cancelTokenHash, hashToken(token))) return INVALID;

  const alreadyCancelled = req.status === "CONTACT_ANNULE";
  const settings = await getSettings();
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    if (!alreadyCancelled) {
      await tx.contactRequest.update({
        where: { id: req.id },
        data: { status: "CONTACT_ANNULE", cancelledAt: now, cancelledBy: "VISITOR", closedAt: now, lastActivityAt: now },
      });
      await tx.requestEvent.create({ data: { requestId: req.id, type: "CANCELLED_BY_VISITOR", data: { deleteData, oppose } } });
      await enqueueNotifications(tx, req.id, "REQUEST_CANCELLED", settings);
    }
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
      }
    }
    if (deleteData && !req.anonymizedAt) {
      await anonymizeRequest(tx, req.id, null, "Demande d'effacement lors de l'annulation");
    }
  });
  logger.info("request_cancelled", { reference: req.reference });
  return { ok: true, status: 200, requestId: req.id, reference: req.reference, alreadyCancelled };
}
