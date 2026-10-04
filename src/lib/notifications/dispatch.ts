import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../db";
import { env } from "../env";
import { errorCode, logger } from "../logger";
import { getSettings, notificationTransports } from "../settings";
import type { SiteSettings } from "../settings-schema";
import { notificationTransport } from "./transports";
import { webhookBody } from "./webhook-format";

export type NotificationEvent = "NEW_REQUEST" | "REQUEST_CANCELLED";

const MAX_ATTEMPTS = 6;
const BACKOFF_MINUTES = [1, 5, 30, 120, 720, 1440];

/** Crée les notifications à envoyer (dans la même transaction que la demande). */
export async function enqueueNotifications(
  tx: Prisma.TransactionClient,
  requestId: string,
  event: NotificationEvent,
  settings: SiteSettings,
): Promise<number> {
  const transports = notificationTransports();
  if (event === "REQUEST_CANCELLED" && !settings.notifications.notifyOnCancellation) return 0;
  const rows: Prisma.NotificationCreateManyInput[] = [];
  if (settings.notifications.emailRecipients.length > 0 && transports.email) {
    rows.push({ requestId, event, channel: "EMAIL" });
  }
  if (settings.notifications.webhookUrl && transports.webhook) {
    rows.push({ requestId, event, channel: "WEBHOOK" });
  }
  if (rows.length === 0) return 0;
  await tx.notification.createMany({ data: rows });
  return rows.length;
}

function frDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Paris" }).format(d);
}

/**
 * Envoie une notification. Ne lève jamais d'exception : un échec est enregistré et retenté plus tard.
 * Le contenu se limite à la référence, au canal demandé et au lien vers la fiche sécurisée.
 */
export async function dispatchNotification(id: string): Promise<"SENT" | "FAILED" | "SKIPPED"> {
  const n = await prisma.notification.findUnique({
    where: { id },
    include: { request: { select: { id: true, reference: true, channel: true, createdAt: true, callbackDeadline: true, kind: true } } },
  });
  if (!n || n.status === "SENT" || n.status === "SKIPPED") return "SKIPPED";
  const settings = await getSettings();
  const req = n.request;
  if (!req) {
    await prisma.notification.update({ where: { id }, data: { status: "SKIPPED", lastError: "REQUEST_DELETED" } });
    return "SKIPPED";
  }
  const link = `${env().APP_URL.replace(/\/$/, "")}/admin/demandes/${req.id}`;
  const channelLabel = req.channel === "PHONE" ? "rappel téléphonique" : "réponse par e-mail";
  try {
    const t = notificationTransport();
    if (n.channel === "EMAIL") {
      const subject =
        n.event === "NEW_REQUEST" ? `Nouvelle demande ${req.reference}` : `Demande ${req.reference} annulée par le visiteur`;
      const lines =
        n.event === "NEW_REQUEST"
          ? [
              "Une nouvelle demande de contact a été enregistrée.",
              "",
              `Référence : ${req.reference}`,
              `Reçue le : ${frDate(req.createdAt)}`,
              `Canal demandé : ${channelLabel}`,
              ...(req.callbackDeadline ? [`Échéance de rappel : ${frDate(req.callbackDeadline)}`] : []),
              "",
              `Fiche (connexion requise) : ${link}`,
            ]
          : [`La demande ${req.reference} a été annulée par le visiteur. Ne pas le contacter.`, "", `Fiche : ${link}`];
      lines.push("", "Ce message ne contient volontairement aucune donnée personnelle.");
      await t.sendEmail({ to: settings.notifications.emailRecipients, subject, text: lines.join("\n") });
    } else {
      if (!settings.notifications.webhookUrl) throw new Error("WEBHOOK_URL_MISSING");
      // Texte lisible sur une messagerie (Discord, Slack, Telegram) : référence, échéance et lien, sans donnée personnelle.
      const text =
        n.event === "NEW_REQUEST"
          ? `Nouvelle demande ${req.reference} (${channelLabel})${req.callbackDeadline ? `, à traiter avant le ${frDate(req.callbackDeadline)}` : ""} : ${link}`
          : `Demande ${req.reference} annulée par le visiteur : ne pas le contacter. ${link}`;
      await t.postWebhook({
        url: settings.notifications.webhookUrl,
        body: webhookBody(
          settings.notifications.webhookUrl,
          {
            event: n.event === "NEW_REQUEST" ? "request.created" : "request.cancelled",
            reference: req.reference,
            requestId: req.id,
            kind: req.kind,
            channel: req.channel,
            createdAt: req.createdAt.toISOString(),
            callbackDeadline: req.callbackDeadline?.toISOString() ?? null,
            url: link,
          },
          text,
        ),
      });
    }
    await prisma.notification.update({ where: { id }, data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 }, lastError: null } });
    return "SENT";
  } catch (err) {
    const attempts = n.attempts + 1;
    const delay = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)] ?? 60;
    await prisma.notification
      .update({
        where: { id },
        data: {
          status: "FAILED",
          attempts,
          lastError: errorCode(err).slice(0, 120),
          nextAttemptAt: new Date(Date.now() + delay * 60_000),
        },
      })
      .catch(() => undefined);
    logger.warn("notification_failed", { event: n.event, channel: n.channel, attempts, code: errorCode(err) });
    return "FAILED";
  }
}

/** Envoie les notifications en attente (ou à retenter). */
export async function dispatchPendingNotifications(options: { requestId?: string; limit?: number } = {}): Promise<{ sent: number; failed: number }> {
  const due = await prisma.notification.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: MAX_ATTEMPTS },
      nextAttemptAt: { lte: new Date() },
      ...(options.requestId ? { requestId: options.requestId } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: options.limit ?? 50,
    select: { id: true },
  });
  let sent = 0;
  let failed = 0;
  for (const { id } of due) {
    const r = await dispatchNotification(id);
    if (r === "SENT") sent++;
    else if (r === "FAILED") failed++;
  }
  return { sent, failed };
}
