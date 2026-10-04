import "server-only";
import { evaluate, firstUnanswered, pruneAnswers, resolveTerritory, type Answers, type Evaluation } from "@/engine";
import type { Prisma } from "@/generated/prisma/client";
import { addJoursOuvrables, parisToday } from "../business-days";
import { prisma } from "../db";
import { hashEmail, hashIp, hashPhone, hashToken, sha256Hex } from "../crypto";
import { noticeWithHash } from "../legal/notice";
import { buildRequestSentence } from "../legal/texts";
import { errorCode, logger } from "../logger";
import { enqueueNotifications } from "../notifications/dispatch";
import { rateLimit } from "../ratelimit";
import { getRuleSetByVersion } from "../rulesets";
import { getSettings } from "../settings";
import { emailReplyAvailable, phoneCallbackAvailable, submissionsOpen } from "../settings-schema";
import { verifyTurnstile } from "../turnstile";
import { type ParsedRequestPayload, requestPayloadSchema } from "../validation/request";
import { cancelTokenFor, generateReference } from "./reference";
import { worksTextForRequest } from "./shared";

export type CreateResult =
  | {
      ok: true;
      status: 200 | 201;
      replay: boolean;
      requestId: string;
      reference: string;
      cancelToken: string;
      channel: "PHONE" | "EMAIL";
      callbackDeadline: string | null;
      requestSentence: string;
    }
  | { ok: false; status: 400 | 403 | 409 | 422 | 429 | 503; code: string; message: string; fieldErrors?: Record<string, string> };

const fail = (status: 400 | 403 | 409 | 422 | 429 | 503, code: string, message: string, fieldErrors?: Record<string, string>): CreateResult => ({
  ok: false,
  status,
  code,
  message,
  ...(fieldErrors ? { fieldErrors } : {}),
});

/** Délai minimal de remplissage du formulaire de contact (en dessous : envoi automatisé probable). */
export const MIN_FORM_ELAPSED_MS = 2500;

function previousDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function isUniqueViolation(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002");
}

async function existingReplay(idempotencyKey: string, payloadHash: string): Promise<CreateResult | null> {
  const existing = await prisma.contactRequest.findUnique({
    where: { idempotencyKey },
    select: { id: true, reference: true, payloadHash: true, channel: true, callbackDeadline: true, requestSentence: true },
  });
  if (!existing) return null;
  if (existing.payloadHash !== payloadHash) {
    return fail(409, "IDEMPOTENCY_CONFLICT", "Cette demande a déjà été envoyée avec un contenu différent. Rechargez la page pour en créer une nouvelle.");
  }
  return {
    ok: true,
    status: 200,
    replay: true,
    requestId: existing.id,
    reference: existing.reference,
    cancelToken: cancelTokenFor(idempotencyKey),
    channel: existing.channel,
    callbackDeadline: existing.callbackDeadline?.toISOString() ?? null,
    requestSentence: existing.requestSentence,
  };
}

export async function createContactRequest(
  raw: unknown,
  ctx: { ip: string | null; userAgent: string | null; now?: Date },
): Promise<CreateResult> {
  const now = ctx.now ?? new Date();
  const ipKey = ctx.ip ?? "unknown";

  // 1. Limitation de débit (par empreinte d'IP).
  const burst = await rateLimit("request", ipKey, 5, 600);
  const daily = await rateLimit("request-day", ipKey, 20, 86_400);
  if (!burst.allowed || !daily.allowed) {
    return fail(429, "RATE_LIMITED", "Trop de demandes ont été envoyées depuis cette connexion. Merci de réessayer plus tard.");
  }

  // 2. Validation stricte.
  const parsed = requestPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail(422, "INVALID_PAYLOAD", "Certaines informations sont invalides.", fieldErrors);
  }
  const payload: ParsedRequestPayload = parsed.data;

  // 3. Protections anti-robots.
  if (payload.website && payload.website.length > 0) return fail(400, "REJECTED", "Envoi refusé.");
  if (payload.formElapsedMs < MIN_FORM_ELAPSED_MS) {
    return fail(400, "TOO_FAST", "Merci de prendre le temps de relire votre demande avant de l'envoyer.");
  }
  if (!(await verifyTurnstile(payload.turnstileToken, ctx.ip))) {
    return fail(400, "CAPTCHA_FAILED", "La vérification anti-robot a échoué. Merci de réessayer.");
  }

  // 4. Paramètres et canaux ouverts.
  const settings = await getSettings();
  if (!submissionsOpen(settings)) {
    return fail(503, "SUBMISSIONS_CLOSED", "Le formulaire de contact n'est pas encore ouvert. Merci de réessayer ultérieurement.");
  }
  const channel = payload.contact.channel;
  if ((channel === "PHONE" && !phoneCallbackAvailable(settings)) || (channel === "EMAIL" && !emailReplyAvailable(settings))) {
    return fail(403, "CHANNEL_UNAVAILABLE", "Ce canal de réponse n'est pas proposé actuellement.");
  }

  // 5. Le texte d'information présenté doit être celui en vigueur.
  const notice = noticeWithHash(settings);
  if (notice.hash !== payload.noticeHash) {
    return fail(409, "NOTICE_CHANGED", "Les informations sur le traitement de vos données ont été mises à jour : merci de les relire avant d'envoyer.");
  }

  // 6. Réévaluation serveur avec la version de règles affichée au visiteur.
  let answers: Answers;
  let evaluation: Evaluation | null = null;
  let ruleSetId: string | null = null;
  if (payload.kind === "SIMULATION") {
    const ruleSet = await getRuleSetByVersion(payload.ruleSetVersion);
    if (!ruleSet) return fail(409, "RULESET_CHANGED", "Les règles du simulateur ont été mises à jour : merci de refaire la simulation.");
    const today = parisToday(now);
    if (payload.referenceDate !== today && payload.referenceDate !== previousDay(today)) {
      return fail(409, "STALE_EVALUATION", "Votre simulation date de plus d'un jour : merci de la refaire.");
    }
    const qctx = { rules: ruleSet.data, referenceDate: payload.referenceDate };
    answers = pruneAnswers(payload.answers as Answers, qctx);
    if (firstUnanswered(answers, qctx) !== null) {
      return fail(422, "INCOMPLETE_ANSWERS", "Le questionnaire n'est pas complet.");
    }
    evaluation = evaluate(answers, ruleSet, payload.referenceDate);
    ruleSetId = ruleSet.id;
  } else {
    answers = payload.answers as Answers;
  }
  const { territory, departement } = resolveTerritory(answers);

  // 7. Coordonnées strictement nécessaires au canal choisi.
  const email = channel === "EMAIL" ? payload.contact.email || null : null;
  const phone = channel === "PHONE" ? payload.contact.phone || null : null;
  const contactNormalized = {
    firstName: payload.contact.firstName,
    lastName: payload.contact.lastName,
    channel,
    email,
    phone,
    availability: payload.contact.availability ?? null,
    comment: payload.contact.comment || null,
  };

  const requestSentence = buildRequestSentence(settings.company.name, channel, worksTextForRequest(payload.kind, answers));
  const payloadHash = sha256Hex(
    JSON.stringify({
      kind: payload.kind,
      answers,
      contact: contactNormalized,
      ruleSetVersion: payload.kind === "SIMULATION" ? payload.ruleSetVersion : null,
      referenceDate: payload.kind === "SIMULATION" ? payload.referenceDate : null,
    }),
  );

  // 8. Idempotence : un double envoi renvoie la même demande.
  const replay = await existingReplay(payload.idempotencyKey, payloadHash);
  if (replay) return replay;

  // 9. Liste d'opposition (signalement interne, la demande explicite reste enregistrée).
  const phoneHash = phone ? hashPhone(phone) : null;
  const emailHash = email ? hashEmail(email) : null;
  const opposition = await prisma.opposition.findFirst({
    where: {
      OR: [...(phoneHash ? [{ phoneHash }] : []), ...(emailHash ? [{ emailHash }] : [])],
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
    },
    select: { id: true },
  });

  // 10. Échéance de rappel (jours ouvrables, art. R223-4).
  const callbackDeadline =
    channel === "PHONE"
      ? addJoursOuvrables(now, settings.contact.callbackDelayBusinessDays, { alsaceMoselle: settings.contact.alsaceMoselleHolidays })
      : null;

  // 11. Source d'acquisition (paramètres de campagne sans donnée personnelle).
  const acq = settings.acquisition.collectCampaignParams ? payload.acquisition : undefined;
  let acquisitionOrigin: "DIRECT" | "AUTHORIZED_CAMPAIGN" | "UNLISTED_CAMPAIGN" | "NOT_COLLECTED" = "NOT_COLLECTED";
  if (settings.acquisition.collectCampaignParams) {
    if (acq?.utmCampaign || acq?.utmSource) {
      const known = acq.utmCampaign
        ? await prisma.acquisitionChannel.findFirst({ where: { campaign: acq.utmCampaign, active: true }, select: { id: true } })
        : null;
      acquisitionOrigin = known ? "AUTHORIZED_CAMPAIGN" : "UNLISTED_CAMPAIGN";
    } else {
      acquisitionOrigin = "DIRECT";
    }
  }

  const cancelToken = cancelTokenFor(payload.idempotencyKey);

  // 12. Enregistrement (transaction) + file de notifications.
  for (let attempt = 0; attempt < 3; attempt++) {
    const reference = generateReference();
    try {
      const created = await prisma.$transaction(async (tx) => {
        const text = await tx.textVersion.upsert({
          where: { hash: notice.hash },
          create: { kind: "CONTACT_NOTICE", hash: notice.hash, content: notice.text },
          update: {},
          select: { id: true },
        });
        const request = await tx.contactRequest.create({
          data: {
            reference,
            idempotencyKey: payload.idempotencyKey,
            payloadHash,
            kind: payload.kind,
            status: opposition ? "A_VERIFIER" : "NOUVEAU",
            firstName: contactNormalized.firstName,
            lastName: contactNormalized.lastName,
            email,
            phone,
            channel,
            availability: (contactNormalized.availability ?? undefined) as Prisma.InputJsonValue | undefined,
            comment: contactNormalized.comment,
            postalCode: answers.postalCode ?? null,
            communeName: answers.communeName ?? null,
            communeInsee: answers.communeInsee ?? null,
            departement,
            territory,
            answers: answers as unknown as Prisma.InputJsonValue,
            projectTypes: answers.works ?? [],
            evaluation: (evaluation ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
            overallOutcome: evaluation ? evaluation.outcome : "NOT_EVALUATED",
            engineVersion: evaluation?.engineVersion ?? null,
            ruleSetVersion: evaluation?.ruleSetVersion ?? null,
            ruleSetId,
            evaluatedAt: evaluation ? now : null,
            requestSentence,
            noticeTextId: text.id,
            submittedAt: now,
            ipHash: hashIp(ctx.ip),
            userAgent: ctx.userAgent,
            phoneHash,
            emailHash,
            acquisitionOrigin,
            utmSource: acq?.utmSource ?? null,
            utmMedium: acq?.utmMedium ?? null,
            utmCampaign: acq?.utmCampaign ?? null,
            landingPath: acq?.landingPath ?? null,
            referrerHost: acq?.referrerHost ?? null,
            callbackDeadline,
            cancelTokenHash: hashToken(cancelToken),
            oppositionMatch: Boolean(opposition),
            lastActivityAt: now,
          },
          select: { id: true, reference: true },
        });
        await tx.requestEvent.create({
          data: {
            requestId: request.id,
            type: "CREATED",
            data: { kind: payload.kind, channel, outcome: evaluation?.outcome ?? "NOT_EVALUATED", oppositionMatch: Boolean(opposition) },
          },
        });
        await enqueueNotifications(tx, request.id, "NEW_REQUEST", settings);
        return request;
      });
      logger.info("request_created", { reference: created.reference, channel });
      return {
        ok: true,
        status: 201,
        replay: false,
        requestId: created.id,
        reference: created.reference,
        cancelToken,
        channel,
        callbackDeadline: callbackDeadline?.toISOString() ?? null,
        requestSentence,
      };
    } catch (err) {
      if (isUniqueViolation(err)) {
        // Double envoi simultané : l'autre requête a gagné → réponse idempotente.
        const r = await existingReplay(payload.idempotencyKey, payloadHash);
        if (r) return r;
        continue; // collision de référence : on régénère
      }
      logger.error("request_create_failed", { code: errorCode(err) });
      throw err;
    }
  }
  return fail(503, "REFERENCE_COLLISION", "Une erreur temporaire est survenue. Merci de réessayer.");
}
