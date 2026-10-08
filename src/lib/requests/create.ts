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
import { referenceYearOf, selectPartnerForRequest } from "../leads/partners";
import { listPartners, requestPartnerCandidates } from "../leads/partners-db";
import { leadProfileColumns, requestLeadProfile } from "../leads/profile";
import {
  contactAcceptedFor,
  emailReplyAvailable,
  incomeAcceptedFor,
  phoneCallbackAvailable,
  referralEnabled,
  submissionsOpen,
} from "../settings-schema";
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
      /** Entreprise partenaire nommée dans la demande (nom affiché), ou null. */
      partnerName: string | null;
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
    select: { id: true, reference: true, payloadHash: true, channel: true, callbackDeadline: true, requestSentence: true, requestedPartnerName: true },
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
    partnerName: existing.requestedPartnerName,
  };
}

/** Message commun au navigateur : il recharge la configuration publique et fait relire la demande. */
const PARTNER_CHANGED_MESSAGE =
  "Les informations sur l'entreprise partenaire ont été mises à jour : merci de relire votre demande avant de l'envoyer.";

/**
 * Coordonnées enregistrées : celle du canal choisi ; l'e-mail (avec un rappel) et l'adresse du logement
 * seulement s'ils sont donnés. Aucun numéro n'est conservé pour une réponse par e-mail : seul le canal
 * demandé peut être utilisé.
 */
function normalizedContact(payload: ParsedRequestPayload) {
  const channel = payload.contact.channel;
  return {
    firstName: payload.contact.firstName,
    lastName: payload.contact.lastName,
    channel,
    email: payload.contact.email || null,
    phone: channel === "PHONE" ? payload.contact.phone || null : null,
    streetAddress: payload.contact.streetAddress || null,
    availability: payload.contact.availability ?? null,
    comment: payload.contact.comment || null,
  };
}

/** Empreinte du contenu de la demande (idempotence : un renvoi doit porter exactement le même contenu). */
function payloadHashFor(payload: ParsedRequestPayload, answers: Answers): string {
  const shownPartnerId = payload.partnerId ?? null;
  return sha256Hex(
    JSON.stringify({
      kind: payload.kind,
      answers,
      contact: normalizedContact(payload),
      ruleSetVersion: payload.kind === "SIMULATION" ? payload.ruleSetVersion : null,
      referenceDate: payload.kind === "SIMULATION" ? payload.referenceDate : null,
      // Absente sans entreprise nommée : empreinte inchangée pour les demandes sans mise en relation.
      ...(shownPartnerId ? { partnerId: shownPartnerId, partnerName: payload.partnerName ?? null } : {}),
    }),
  );
}

/**
 * Renvoi d'une demande déjà enregistrée (réponse perdue, double clic) : réponse idempotente, avant
 * les contrôles des paramètres et des règles, qui ont pu changer depuis l'enregistrement. Les réponses
 * sont élaguées avec la version de règles de la demande, comme à l'enregistrement.
 */
async function earlyReplay(payload: ParsedRequestPayload): Promise<CreateResult | null> {
  const known = await prisma.contactRequest.findUnique({ where: { idempotencyKey: payload.idempotencyKey }, select: { id: true } });
  if (!known) return null;
  let answers: Answers;
  if (payload.kind === "SIMULATION") {
    const ruleSet = await getRuleSetByVersion(payload.ruleSetVersion);
    if (!ruleSet) return null;
    answers = pruneAnswers(payload.answers as Answers, { rules: ruleSet.data, referenceDate: payload.referenceDate });
  } else {
    answers = payload.answers as Answers;
  }
  return existingReplay(payload.idempotencyKey, payloadHashFor(payload, answers));
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

  // 3 bis. Demande déjà enregistrée avec cette clé : même réponse, quels que soient les paramètres actuels.
  const known = await earlyReplay(payload);
  if (known) return known;

  // 4. Paramètres et canaux ouverts.
  const settings = await getSettings();
  if (!submissionsOpen(settings)) {
    return fail(503, "SUBMISSIONS_CLOSED", "Le formulaire de contact n'est pas encore ouvert. Merci de réessayer ultérieurement.");
  }
  const channel = payload.contact.channel;
  if ((channel === "PHONE" && !phoneCallbackAvailable(settings)) || (channel === "EMAIL" && !emailReplyAvailable(settings))) {
    return fail(403, "CHANNEL_UNAVAILABLE", "Ce canal de réponse n'est pas proposé actuellement.");
  }
  if (payload.kind === "QUICK_CALLBACK" && !settings.contact.quickCallbackEnabled) {
    return fail(403, "QUICK_CALLBACK_CLOSED", "Pour être recontacté(e), faites d'abord le test d'éligibilité : il ne prend que quelques minutes.");
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
    // Rendez-vous proposés seulement aux résultats retenus dans les paramètres (projets éligibles par défaut).
    if (!contactAcceptedFor(settings, evaluation.outcome)) {
      return fail(
        403,
        "OUTCOME_NOT_ACCEPTED",
        "D'après vos réponses, les conditions des aides évaluées ne semblent pas remplies : nous ne pouvons pas vous proposer de rendez-vous.",
      );
    }
    // Catégories de revenus retenues dans les paramètres (bleu et jaune par défaut ; « je ne sais pas » toujours accepté).
    if (!incomeAcceptedFor(settings.contact.acceptedIncomeCategories, answers.income)) {
      return fail(403, "INCOME_NOT_ACCEPTED", "Nous ne proposons pas de rendez-vous pour cette catégorie de revenus.");
    }
  } else {
    answers = payload.answers as Answers;
  }
  const { territory, departement } = resolveTerritory(answers);

  // 7. Coordonnées enregistrées (canal choisi, e-mail et adresse s'ils sont donnés).
  const contactNormalized = normalizedContact(payload);
  const { email, phone, streetAddress } = contactNormalized;

  // Profil de la demande, calculé comme dans le navigateur (département déduit de la commune).
  const profile = requestLeadProfile(answers);
  const shownPartnerId = payload.partnerId ?? null;
  const shownPartnerName = payload.partnerName ?? null;
  const payloadHash = payloadHashFor(payload, answers);

  // 8. Idempotence : un double envoi renvoie la même demande.
  const replay = await existingReplay(payload.idempotencyKey, payloadHash);
  if (replay) return replay;

  // 8 bis. Mise en relation : entreprise nommée dans la phrase affichée, choisie dans le navigateur parmi
  //    les entreprises actives et refaite ici avec les mêmes réponses. La demande ne peut être transmise
  //    qu'à l'entreprise que la personne a lue avant d'envoyer (art. L223-1 et R223-4 du Code de la
  //    consommation) : si la liste, les critères ou le nom affiché ont changé depuis l'affichage, l'envoi
  //    est refusé (la phrase enregistrée comme preuve est exactement celle que la personne a cochée).
  //    Rappel rapide (sans test) ou mise en relation non déclarée : aucune entreprise nommée.
  const partner =
    payload.kind === "SIMULATION" && referralEnabled(settings)
      ? selectPartnerForRequest(profile, requestPartnerCandidates(await listPartners({ activeOnly: true })), referenceYearOf(payload.referenceDate))
      : null;
  if ((partner?.id ?? null) !== shownPartnerId || (partner?.displayName ?? null) !== shownPartnerName) {
    return fail(409, "PARTNER_CHANGED", PARTNER_CHANGED_MESSAGE);
  }
  const requestSentence = buildRequestSentence(settings.company.name, channel, worksTextForRequest(payload.kind, answers), partner?.displayName);

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
            streetAddress,
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
            ...leadProfileColumns(profile),
            evaluation: (evaluation ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
            overallOutcome: evaluation ? evaluation.outcome : "NOT_EVALUATED",
            engineVersion: evaluation?.engineVersion ?? null,
            ruleSetVersion: evaluation?.ruleSetVersion ?? null,
            ruleSetId,
            evaluatedAt: evaluation ? now : null,
            requestSentence,
            requestedPartnerId: partner?.id ?? null,
            requestedPartnerName: partner?.displayName ?? null,
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
            data: {
              kind: payload.kind,
              channel,
              outcome: evaluation?.outcome ?? "NOT_EVALUATED",
              oppositionMatch: Boolean(opposition),
              // Nom de l'entreprise nommée dans la demande (aucune coordonnée).
              ...(partner ? { partner: partner.displayName } : {}),
            },
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
        partnerName: partner?.displayName ?? null,
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
