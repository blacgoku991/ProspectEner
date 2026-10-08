"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { INCOME_CATEGORIES } from "@/lib/leads/profile";
import { errorCode } from "@/lib/logger";
import { dispatchPendingNotifications } from "@/lib/notifications/dispatch";
import { notificationTransport } from "@/lib/notifications/transports";
import { requestContext } from "@/lib/request-context";
import { applyRetention } from "@/lib/retention";
import { saveSettings, notificationTransports } from "@/lib/settings";
import { ACTIVITY_KINDS, type SiteSettings, siteSettingsSchema } from "@/lib/settings-schema";
import { webhookBody } from "@/lib/notifications/webhook-format";

export interface SettingsState {
  error?: string;
  ok?: string;
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const bool = (f: FormData, k: string) => f.get(k) === "on";
const int = (f: FormData, k: string) => Number.parseInt(str(f, k), 10);

type Section = "company" | "activity" | "contact" | "notifications" | "retention" | "security" | "launch";

function apply(section: Section, s: SiteSettings, f: FormData, actorLabel: string): SiteSettings {
  const next = structuredClone(s);
  const now = new Date().toISOString();
  switch (section) {
    case "company":
      for (const key of Object.keys(next.company) as (keyof SiteSettings["company"])[]) next.company[key] = str(f, key);
      break;
    case "activity":
      // L'ancienne liste libre des partenaires (activity.partners) est conservée telle quelle : les entreprises se gèrent dans Partenaires.
      next.activity = {
        ...next.activity,
        kinds: ACTIVITY_KINDS.filter((k) => bool(f, `kind-${k}`)),
        description: str(f, "description"),
        qualifications: str(f, "qualifications"),
        interventionArea: str(f, "interventionArea"),
      };
      break;
    case "contact": {
      const wantPhone = bool(f, "phoneCallbackEnabled");
      const confirmed = bool(f, "phoneCallbackConfirm");
      next.contact.emailReplyEnabled = bool(f, "emailReplyEnabled");
      next.contact.showCompanyPhone = bool(f, "showCompanyPhone");
      next.contact.alsaceMoselleHolidays = bool(f, "alsaceMoselleHolidays");
      next.contact.callbackDelayBusinessDays = int(f, "callbackDelayBusinessDays");
      next.contact.quickCallbackEnabled = bool(f, "quickCallbackEnabled");
      const accepted = str(f, "acceptedOutcomes");
      if (accepted === "ELIGIBLE_OR_REVIEW" || accepted === "ELIGIBLE_ONLY" || accepted === "ALL") next.contact.acceptedOutcomes = accepted;
      const incomes = INCOME_CATEGORIES.filter((c) => bool(f, `income-${c}`));
      if (incomes.length === 0) throw new Error("Cochez au moins une catégorie de revenus pour laquelle une demande de rendez-vous est proposée.");
      next.contact.acceptedIncomeCategories = incomes;
      next.test.mode = str(f, "testMode") === "ELIGIBILITE" ? "ELIGIBILITE" : "PROJET";
      if (wantPhone && !next.contact.phoneCallbackReviewedAt && !confirmed) {
        throw new Error("Pour activer le rappel téléphonique, cochez la confirmation après lecture de l'avertissement.");
      }
      next.contact.phoneCallbackEnabled = wantPhone;
      if (wantPhone && confirmed) {
        next.contact.phoneCallbackReviewedAt = now;
        next.contact.phoneCallbackReviewedBy = actorLabel;
      }
      if (!wantPhone) {
        next.contact.phoneCallbackReviewedAt = null;
        next.contact.phoneCallbackReviewedBy = null;
      }
      break;
    }
    case "notifications":
      next.notifications = {
        emailRecipients: str(f, "emailRecipients")
          .split(/[\s,;]+/)
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean),
        webhookUrl: str(f, "webhookUrl"),
        notifyOnCancellation: bool(f, "notifyOnCancellation"),
      };
      break;
    case "retention":
      next.retention = {
        requestMonths: int(f, "requestMonths"),
        cancelledRequestDays: int(f, "cancelledRequestDays"),
        proofMonths: int(f, "proofMonths"),
        auditLogMonths: int(f, "auditLogMonths"),
        oppositionMonths: int(f, "oppositionMonths"),
        funnelStatsMonths: int(f, "funnelStatsMonths"),
      };
      break;
    case "security":
      next.security = { requireMfaForCollaborators: bool(f, "requireMfaForCollaborators"), collaboratorsSeeUnassigned: bool(f, "collaboratorsSeeUnassigned") };
      next.acquisition = { collectCampaignParams: bool(f, "collectCampaignParams") };
      break;
    case "launch":
      if (bool(f, "rulesReviewed") && !next.launch.rulesReviewedAt) {
        next.launch.rulesReviewedAt = now;
        next.launch.rulesReviewedBy = actorLabel;
      }
      if (!bool(f, "rulesReviewed")) {
        next.launch.rulesReviewedAt = null;
        next.launch.rulesReviewedBy = null;
      }
      if (bool(f, "legalReviewed") && !next.launch.legalReviewedAt) {
        next.launch.legalReviewedAt = now;
        next.launch.legalReviewedBy = actorLabel;
      }
      if (!bool(f, "legalReviewed")) {
        next.launch.legalReviewedAt = null;
        next.launch.legalReviewedBy = null;
      }
      break;
  }
  return next;
}

export async function saveSettingsAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const ctx = await requireAdmin();
  const section = str(formData, "section") as Section;
  if (!["company", "activity", "contact", "notifications", "retention", "security", "launch"].includes(section)) return { error: "Section inconnue." };
  let next: SiteSettings;
  try {
    next = apply(section, ctx.settings, formData, ctx.user.email);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const parsed = siteSettingsSchema.safeParse(next);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { error: `Valeur invalide (${i?.path.join(".")}) : ${i?.message}` };
  }
  await saveSettings(parsed.data, ctx.user.id);
  const { ip } = await requestContext();
  await audit({ actor: ctx.user, action: "SETTINGS_UPDATED", targetType: "SiteSettings", ip, metadata: { section } });
  revalidatePath("/", "layout");
  return { ok: "Paramètres enregistrés." };
}

export async function applyRetentionAction(_prev: SettingsState): Promise<SettingsState> {
  const ctx = await requireAdmin();
  const report = await applyRetention(ctx.settings, new Date(), ctx.user.id);
  const { ip } = await requestContext();
  await audit({ actor: ctx.user, action: "RETENTION_APPLIED", targetType: "SiteSettings", ip, metadata: { ...report } });
  revalidatePath("/admin/parametres");
  return {
    ok: `Politique appliquée : ${report.cancelledAnonymized + report.expiredAnonymized} demande(s) anonymisée(s), ${report.proofsPurged} preuve(s) purgée(s), ${report.auditLogsDeleted} entrée(s) de journal supprimée(s).`,
  };
}

export async function retryNotificationsAction(_prev: SettingsState): Promise<SettingsState> {
  const ctx = await requireAdmin();
  await prisma.notification.updateMany({ where: { status: "FAILED" }, data: { nextAttemptAt: new Date() } });
  const r = await dispatchPendingNotifications({ limit: 100 });
  const { ip } = await requestContext();
  await audit({ actor: ctx.user, action: "NOTIFICATIONS_RETRIED", targetType: "Notification", ip, metadata: r });
  revalidatePath("/admin/parametres");
  return { ok: `${r.sent} notification(s) envoyée(s), ${r.failed} en échec.` };
}

/** Message de test sans aucune donnée personnelle. */
export async function testNotificationAction(_prev: SettingsState): Promise<SettingsState> {
  const ctx = await requireAdmin();
  const transports = notificationTransports();
  const n = ctx.settings.notifications;
  const results: string[] = [];
  const t = notificationTransport();
  if (n.emailRecipients.length && transports.email) {
    try {
      await t.sendEmail({ to: n.emailRecipients, subject: "Test de notification", text: "Message de test envoyé depuis les paramètres d'administration. Il ne contient aucune donnée personnelle." });
      results.push("e-mail : envoyé");
    } catch (e) {
      results.push(`e-mail : échec (${errorCode(e)})`);
    }
  }
  if (n.webhookUrl && transports.webhook) {
    try {
      await t.postWebhook({
        url: n.webhookUrl,
        body: webhookBody(
          n.webhookUrl,
          { event: "test", sentAt: new Date().toISOString() },
          "Test de notification : les nouvelles demandes arriveront ici (référence et lien, sans donnée personnelle).",
        ),
      });
      results.push("webhook : envoyé");
    } catch (e) {
      results.push(`webhook : échec (${errorCode(e)})`);
    }
  }
  if (results.length === 0) return { error: "Aucun canal configuré (destinataires + SMTP, ou URL + secret du webhook)." };
  return { ok: `Test : ${results.join(" ; ")}.` };
}
