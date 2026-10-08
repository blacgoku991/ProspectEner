"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { Evaluation } from "@/engine/types";
import { qualificationGroups, qualifiedAids, type StoredQualification } from "@/lib/admin/qualification";
import { audit } from "@/lib/audit";
import { getAccessibleRequestId, requireAdmin, requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { listPartners, partnerDisplayName } from "@/lib/leads/partners-db";
import { requestContext } from "@/lib/request-context";
import { parseParisLocalDateTime } from "@/lib/business-days";
import { anonymizeRequest } from "@/lib/requests/anonymize";
import {
  APPOINTMENT_SENT_EVENT,
  PARTNER_INFORMED_EVENT,
  PARTNER_TO_INFORM_EVENT,
  partnersAlreadySent,
  requirePartnerInform,
  SENT_TO_PARTNERS_SELECT,
} from "@/lib/requests/cancel";
import { referralEnabled } from "@/lib/settings-schema";
import { maskEmail, maskPhone } from "@/lib/validation/contact";

// « Rendez-vous fixé » ne se choisit pas à la main : il passe par la qualification (bookAppointmentAction).
const STATUSES = ["NOUVEAU", "A_VERIFIER", "CONTACTE", "ETUDE_EN_COURS", "TERMINE", "SANS_SUITE", "CONTACT_ANNULE"] as const;
const TERMINAL = new Set(["TERMINE", "SANS_SUITE", "CONTACT_ANNULE"]);

function idFrom(formData: FormData): string {
  return String(formData.get("id") ?? "");
}

export async function updateStatusAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  const id = await getAccessibleRequestId(ctx, idFrom(formData));
  const status = z.enum([...STATUSES, "RDV_FIXE"]).parse(formData.get("status"));
  const current = await prisma.contactRequest.findUniqueOrThrow({ where: { id }, select: { status: true, ...SENT_TO_PARTNERS_SELECT } });
  if (current.status === status || status === "RDV_FIXE") return;
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.contactRequest.update({
      where: { id },
      data: {
        status,
        lastActivityAt: now,
        closedAt: TERMINAL.has(status) ? now : null,
        ...(status === "CONTACT_ANNULE" ? { cancelledAt: now, cancelledBy: "STAFF" } : {}),
      },
    });
    await tx.requestEvent.create({ data: { requestId: id, actorId: ctx.user.id, type: "STATUS_CHANGED", data: { from: current.status, to: status } } });
    // Annulation d'une demande déjà transmise : les entreprises qui l'ont reçue doivent en être informées.
    if (status === "CONTACT_ANNULE") {
      await requirePartnerInform(
        tx,
        id,
        { cancelled: true, deleteData: false, oppose: false, source: "STAFF" },
        await partnersAlreadySent(tx, id, current),
        { actorId: ctx.user.id, settings: ctx.settings, now },
      );
    }
  });
  revalidatePath(`/admin/demandes/${id}`);
}

export async function assignAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  const id = await getAccessibleRequestId(ctx, idFrom(formData));
  const raw = String(formData.get("assigneeId") ?? "");
  const assigneeId = raw === "" ? null : z.uuid().parse(raw);
  const current = await prisma.contactRequest.findUniqueOrThrow({ where: { id }, select: { assignedToId: true } });
  if (ctx.user.role !== "ADMIN") {
    // Un collaborateur peut uniquement prendre une demande libre ou se retirer d'une demande.
    const takes = assigneeId === ctx.user.id && current.assignedToId === null;
    const releases = assigneeId === null && current.assignedToId === ctx.user.id;
    if (!takes && !releases) {
      const { ip } = await requestContext();
      await audit({ actor: ctx.user, action: "ACCESS_DENIED", targetType: "ContactRequest", targetId: id, ip, metadata: { op: "assign" } });
      return;
    }
  }
  if (assigneeId) {
    const target = await prisma.staffUser.findFirst({ where: { id: assigneeId, isActive: true }, select: { id: true } });
    if (!target) return;
  }
  await prisma.$transaction([
    prisma.contactRequest.update({ where: { id }, data: { assignedToId: assigneeId, lastActivityAt: new Date() } }),
    prisma.requestEvent.create({ data: { requestId: id, actorId: ctx.user.id, type: "ASSIGNED", data: { from: current.assignedToId, to: assigneeId } } }),
  ]);
  revalidatePath(`/admin/demandes/${id}`);
  if (ctx.user.role !== "ADMIN" && assigneeId === null && !ctx.settings.security.collaboratorsSeeUnassigned) redirect("/admin/demandes");
}

export async function addNoteAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  const id = await getAccessibleRequestId(ctx, idFrom(formData));
  const body = z.string().trim().min(1).max(4000).parse(formData.get("body"));
  await prisma.$transaction([
    prisma.internalNote.create({ data: { requestId: id, authorId: ctx.user.id, body } }),
    prisma.requestEvent.create({ data: { requestId: id, actorId: ctx.user.id, type: "NOTE_ADDED" } }),
    prisma.contactRequest.update({ where: { id }, data: { lastActivityAt: new Date() } }),
  ]);
  revalidatePath(`/admin/demandes/${id}`);
}

const CONTACT_OUTCOMES = ["CALL_NO_ANSWER", "CALL_REACHED", "EMAIL_SENT", "PROSPECT_REPLIED"] as const;

/**
 * Enregistre une prise de contact. Les appels sont refusés lorsque la demande de rappel
 * n'est plus couverte (délai dépassé sans premier contact, demande annulée ou close).
 */
export async function logContactAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  const id = await getAccessibleRequestId(ctx, idFrom(formData));
  const outcome = z.enum(CONTACT_OUTCOMES).parse(formData.get("outcome"));
  const r = await prisma.contactRequest.findUniqueOrThrow({
    where: { id },
    select: { channel: true, status: true, callbackDeadline: true, firstContactAt: true, anonymizedAt: true },
  });
  const now = new Date();
  const isCall = outcome === "CALL_NO_ANSWER" || outcome === "CALL_REACHED";
  if (r.anonymizedAt || TERMINAL.has(r.status)) return;
  if (isCall && (r.channel !== "PHONE" || (r.callbackDeadline && now > r.callbackDeadline && !r.firstContactAt))) {
    const { ip } = await requestContext();
    await audit({ actor: ctx.user, action: "ACCESS_DENIED", targetType: "ContactRequest", targetId: id, ip, metadata: { op: "call_outside_request" } });
    return;
  }
  const reached = outcome === "CALL_REACHED" || outcome === "PROSPECT_REPLIED";
  // Un e-mail envoyé ne vaut premier contact que pour une demande de réponse par e-mail : sur une demande
  // de rappel, seul un échange effectif lève l'échéance de rappel (art. R223-4) et le statut « Nouveau ».
  const contacted = reached || (outcome === "EMAIL_SENT" && r.channel === "EMAIL");
  await prisma.$transaction([
    prisma.contactRequest.update({
      where: { id },
      data: {
        lastActivityAt: now,
        ...(isCall ? { contactAttempts: { increment: 1 }, lastContactAttemptAt: now } : {}),
        ...(contacted && !r.firstContactAt ? { firstContactAt: now } : {}),
        ...(reached ? { lastProspectContactAt: now } : {}),
        ...(contacted && (r.status === "NOUVEAU" || r.status === "A_VERIFIER") ? { status: "CONTACTE" } : {}),
      },
    }),
    prisma.requestEvent.create({ data: { requestId: id, actorId: ctx.user.id, type: "CONTACT_LOGGED", data: { outcome } } }),
  ]);
  revalidatePath(`/admin/demandes/${id}`);
}

/** Opposition exprimée auprès de l'équipe (téléphone, e-mail, courrier). */
export async function recordOppositionAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  const id = await getAccessibleRequestId(ctx, idFrom(formData));
  const r = await prisma.contactRequest.findUniqueOrThrow({
    where: { id },
    select: { reference: true, status: true, phone: true, email: true, phoneHash: true, emailHash: true, ...SENT_TO_PARTNERS_SELECT },
  });
  const { ip } = await requestContext();
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    if (r.phoneHash || r.emailHash) {
      await tx.opposition.create({
        data: {
          phoneHash: r.phoneHash,
          emailHash: r.emailHash,
          maskedValue: r.phone ? maskPhone(r.phone) : r.email ? maskEmail(r.email) : "Contact anonymisé",
          source: "STAFF",
          note: `Opposition recueillie par l'équipe (demande ${r.reference})`,
          createdById: ctx.user.id,
          expiresAt: new Date(now.getTime() + ctx.settings.retention.oppositionMonths * 30.44 * 24 * 3600 * 1000),
        },
      });
    }
    await tx.contactRequest.update({
      where: { id },
      data: { status: "CONTACT_ANNULE", cancelledAt: now, cancelledBy: "STAFF_OPPOSITION", closedAt: now, lastActivityAt: now },
    });
    await tx.requestEvent.create({ data: { requestId: id, actorId: ctx.user.id, type: "OPPOSITION_RECORDED", data: { source: "STAFF" } } });
    // Demande déjà transmise : les entreprises qui l'ont reçue ne doivent plus contacter la personne.
    await requirePartnerInform(
      tx,
      id,
      { cancelled: r.status !== "CONTACT_ANNULE", deleteData: false, oppose: true, source: "STAFF" },
      await partnersAlreadySent(tx, id, r),
      { actorId: ctx.user.id, settings: ctx.settings, now },
    );
    await audit({ actor: ctx.user, action: "OPPOSITION_ADDED", targetType: "ContactRequest", targetId: id, ip }, tx);
  });
  revalidatePath(`/admin/demandes/${id}`);
}

/** L'équipe a informé la ou les entreprises qui avaient reçu la demande (annulation, opposition, effacement). */
export async function markPartnerInformedAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  const id = await getAccessibleRequestId(ctx, idFrom(formData));
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const r = await tx.contactRequest.findUniqueOrThrow({ where: { id }, select: { partnerInformRequiredAt: true, partnerInformedAt: true } });
    if (!r.partnerInformRequiredAt || r.partnerInformedAt) return;
    // Mise à jour conditionnelle : deux clics simultanés n'enregistrent qu'une information.
    const updated = await tx.contactRequest.updateMany({
      where: { id, partnerInformRequiredAt: r.partnerInformRequiredAt, partnerInformedAt: null },
      data: { partnerInformedAt: now, lastActivityAt: now },
    });
    if (updated.count === 0) return;
    const last = await tx.requestEvent.findFirst({
      where: { requestId: id, type: PARTNER_TO_INFORM_EVENT },
      orderBy: { createdAt: "desc" },
      select: { data: true },
    });
    const partners = (last?.data as { partners?: unknown } | null)?.partners;
    await tx.requestEvent.create({
      data: { requestId: id, actorId: ctx.user.id, type: PARTNER_INFORMED_EVENT, data: { partners: Array.isArray(partners) ? partners : [] } },
    });
  });
  revalidatePath(`/admin/demandes/${id}`);
}

export async function anonymizeAction(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = await getAccessibleRequestId(ctx, idFrom(formData));
  const { ip } = await requestContext();
  const r = await prisma.contactRequest.findUniqueOrThrow({ where: { id }, select: { anonymizedAt: true, ...SENT_TO_PARTNERS_SELECT } });
  await prisma.$transaction(async (tx) => {
    // Effacement d'une demande déjà transmise : les entreprises qui l'ont reçue en sont informées (art. 19 RGPD).
    if (!r.anonymizedAt) {
      await requirePartnerInform(
        tx,
        id,
        { cancelled: false, deleteData: true, oppose: false, source: "STAFF" },
        await partnersAlreadySent(tx, id, r),
        { actorId: ctx.user.id, settings: ctx.settings, now: new Date() },
      );
    }
    await anonymizeRequest(tx, id, ctx.user.id, "Anonymisation manuelle");
    await audit({ actor: ctx.user, action: "REQUEST_ANONYMIZED", targetType: "ContactRequest", targetId: id, ip }, tx);
  });
  revalidatePath(`/admin/demandes/${id}`);
}

export async function deleteAction(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = await getAccessibleRequestId(ctx, idFrom(formData));
  const r = await prisma.contactRequest.findUniqueOrThrow({ where: { id }, select: { reference: true } });
  if (String(formData.get("confirmReference") ?? "").trim().toUpperCase() !== r.reference) return;
  const { ip } = await requestContext();
  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { requestId: id } });
    await tx.contactRequest.delete({ where: { id } });
    await audit({ actor: ctx.user, action: "REQUEST_DELETED", targetType: "ContactRequest", targetId: id, ip, metadata: { reference: r.reference } }, tx);
  });
  redirect("/admin/demandes");
}

// ─── Qualification et rendez-vous ───────────────────────────────────────────

export interface AppointmentState {
  error?: string;
  ok?: boolean;
}

const MAX_APPOINTMENT_DAYS = 180;

/** Noms comparés sans tenir compte des espaces (dénominations reprises de l'ancienne liste libre). */
function sameDisplayName(a: string, b: string): boolean {
  const norm = (v: string) => v.replace(/\s+/g, " ").trim();
  return norm(a) === norm(b);
}

/**
 * Fixe un rendez-vous, seulement après qualification : tous les critères d'au moins une aide
 * encore accessible doivent avoir été confirmés avec la personne.
 */
export async function bookAppointmentAction(_prev: AppointmentState, formData: FormData): Promise<AppointmentState> {
  const ctx = await requireStaff();
  const id = await getAccessibleRequestId(ctx, idFrom(formData));
  const r = await prisma.contactRequest.findUniqueOrThrow({
    where: { id },
    select: { status: true, anonymizedAt: true, evaluation: true, firstContactAt: true, requestedPartnerId: true, requestedPartnerName: true },
  });
  if (r.anonymizedAt || TERMINAL.has(r.status)) return { error: "Cette demande est close : aucun rendez-vous ne peut être fixé." };
  const groups = qualificationGroups((r.evaluation as unknown as Evaluation | null) ?? null);
  if (groups.length === 0) return { error: "D'après le test, aucune aide n'est accessible : pas de rendez-vous possible." };
  const checked = new Set(formData.getAll("checked").map(String));
  const aids = qualifiedAids(groups, checked);
  if (aids.length === 0) {
    return { error: "Qualification incomplète : confirmez tous les critères d'au moins une aide avant de fixer le rendez-vous." };
  }
  const when = parseParisLocalDateTime(String(formData.get("appointmentAt") ?? ""));
  if (!when) return { error: "Indiquez la date et l'heure du rendez-vous." };
  const now = Date.now();
  if (when.getTime() < now - 10 * 60_000 || when.getTime() > now + MAX_APPOINTMENT_DAYS * 24 * 3600_000) {
    return { error: "Le rendez-vous doit être fixé dans les six prochains mois." };
  }
  const mode = z.enum(["DOMICILE", "VISIO", "TELEPHONE"]).safeParse(formData.get("mode"));
  if (!mode.success) return { error: "Choisissez le mode du rendez-vous." };
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  // Mise en relation : le rendez-vous peut être confié à une entreprise partenaire active (Partenaires),
  // annoncée par la notice d'information et acceptée par la personne pendant l'échange. Le formulaire
  // envoie l'identifiant de l'entreprise ; le nom affiché à la personne est enregistré avec lui.
  const partnerId = String(formData.get("partnerId") ?? "").trim();
  let partner: { id: string; displayName: string } | null = null;
  if (partnerId) {
    if (!referralEnabled(ctx.settings)) {
      return {
        error:
          "Pour confier un rendez-vous à une autre entreprise, cochez d'abord « Mise en relation avec des professionnels » dans Paramètres → Activité : la notice d'information doit l'annoncer aux visiteurs.",
      };
    }
    const found = (await listPartners({ activeOnly: true })).find((p) => p.id === partnerId);
    if (!found) return { error: "Entreprise partenaire inconnue ou désactivée : choisissez une entreprise de la liste." };
    partner = { id: found.id, displayName: partnerDisplayName(found) };
    // Demande qui nomme une entreprise : elle lui est transmise, à elle seule (notice d'information validée
    // par la personne) ; le rendez-vous ne peut être confié à une autre entreprise.
    if (r.requestedPartnerId || r.requestedPartnerName) {
      const isRequested =
        partner.id === r.requestedPartnerId ||
        (r.requestedPartnerName !== null && sameDisplayName(partner.displayName, r.requestedPartnerName));
      if (!isRequested) {
        return {
          error: `Cette demande nomme ${r.requestedPartnerName ?? "une autre entreprise"} : le rendez-vous ne peut être confié qu'à cette entreprise ou assuré par votre entreprise.`,
        };
      }
    }
    if (formData.get("partnerConsent") !== "on") {
      return { error: "Cochez l'accord de la personne pour la transmission de ses coordonnées et de ses réponses à cette entreprise." };
    }
  }
  const validKeys = new Set(groups.flatMap((g) => g.items.map((i) => i.key)));
  const qualification: StoredQualification = {
    aids,
    checked: [...checked].filter((k) => validKeys.has(k)),
    byId: ctx.user.id,
    byName: ctx.user.displayName,
    at: new Date(now).toISOString(),
  };
  const at = new Date(now);
  await prisma.$transaction([
    prisma.contactRequest.update({
      where: { id },
      data: {
        status: "RDV_FIXE",
        qualification: qualification as unknown as Prisma.InputJsonValue,
        qualifiedAt: at,
        appointmentAt: when,
        appointmentMode: mode.data,
        appointmentNote: note || null,
        appointmentPartner: partner?.displayName ?? null,
        appointmentPartnerId: partner?.id ?? null,
        partnerConsentAt: partner ? at : null,
        partnerSentAt: null,
        lastActivityAt: at,
        lastProspectContactAt: at,
        ...(r.firstContactAt ? {} : { firstContactAt: at }),
      },
    }),
    prisma.requestEvent.create({
      data: {
        requestId: id,
        actorId: ctx.user.id,
        type: "APPOINTMENT_BOOKED",
        data: { at: when.toISOString(), mode: mode.data, aids, ...(partner ? { partner: partner.displayName } : {}) },
      },
    }),
  ]);
  revalidatePath(`/admin/demandes/${id}`);
  return { ok: true };
}

export async function cancelAppointmentAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  const id = await getAccessibleRequestId(ctx, idFrom(formData));
  const r = await prisma.contactRequest.findUniqueOrThrow({ where: { id }, select: { status: true, appointmentAt: true } });
  if (r.status !== "RDV_FIXE") return;
  await prisma.$transaction([
    prisma.contactRequest.update({
      where: { id },
      data: {
        status: "CONTACTE",
        appointmentAt: null,
        appointmentMode: null,
        appointmentNote: null,
        appointmentPartner: null,
        appointmentPartnerId: null,
        partnerConsentAt: null,
        partnerSentAt: null,
        lastActivityAt: new Date(),
      },
    }),
    prisma.requestEvent.create({
      data: { requestId: id, actorId: ctx.user.id, type: "APPOINTMENT_CANCELLED", data: { at: r.appointmentAt?.toISOString() ?? null } },
    }),
  ]);
  revalidatePath(`/admin/demandes/${id}`);
}

/** Récapitulatif du rendez-vous transmis à l'entreprise partenaire : la première transmission est tracée. */
export async function recordHandoffAction(requestId: string): Promise<void> {
  const ctx = await requireStaff();
  const id = await getAccessibleRequestId(ctx, requestId);
  const r = await prisma.contactRequest.findUniqueOrThrow({
    where: { id },
    select: { status: true, anonymizedAt: true, appointmentPartner: true, partnerConsentAt: true, partnerSentAt: true },
  });
  if (r.status !== "RDV_FIXE" || r.anonymizedAt || !r.appointmentPartner || !r.partnerConsentAt || r.partnerSentAt) return;
  const now = new Date();
  await prisma.$transaction([
    prisma.contactRequest.update({ where: { id }, data: { partnerSentAt: now, lastActivityAt: now } }),
    prisma.requestEvent.create({ data: { requestId: id, actorId: ctx.user.id, type: APPOINTMENT_SENT_EVENT, data: { partner: r.appointmentPartner } } }),
  ]);
  revalidatePath(`/admin/demandes/${id}`);
}

/** Les critères n'ont pas pu être confirmés avec la personne : demande close, sans rendez-vous. */
export async function markNotEligibleAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  const id = await getAccessibleRequestId(ctx, idFrom(formData));
  const r = await prisma.contactRequest.findUniqueOrThrow({ where: { id }, select: { status: true } });
  if (TERMINAL.has(r.status)) return;
  const now = new Date();
  await prisma.$transaction([
    prisma.contactRequest.update({ where: { id }, data: { status: "SANS_SUITE", closedAt: now, lastActivityAt: now } }),
    prisma.requestEvent.create({ data: { requestId: id, actorId: ctx.user.id, type: "QUALIFICATION_FAILED", data: { from: r.status } } }),
  ]);
  revalidatePath(`/admin/demandes/${id}`);
}
