import "server-only";
import { prisma } from "./db";
import { anonymizeRequest, purgeProof } from "./requests/anonymize";
import type { SiteSettings } from "./settings-schema";

function monthsAgo(now: Date, months: number): Date {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 3600 * 1000);
}

export interface RetentionReport {
  cancelledAnonymized: number;
  expiredAnonymized: number;
  proofsPurged: number;
  auditLogsDeleted: number;
  oppositionsDeleted: number;
  funnelStatsDeleted: number;
  sessionsDeleted: number;
  notificationsDeleted: number;
  rateLimitsDeleted: number;
}

/** Critères de la politique de conservation (voir docs/CONFORMITE.md). */
function criteria(settings: SiteSettings, now: Date) {
  const r = settings.retention;
  const requestCutoff = monthsAgo(now, r.requestMonths);
  return {
    cancelled: { status: "CONTACT_ANNULE" as const, anonymizedAt: null, cancelledAt: { lt: daysAgo(now, r.cancelledRequestDays) } },
    expired: {
      anonymizedAt: null,
      submittedAt: { lt: requestCutoff },
      OR: [{ lastProspectContactAt: null }, { lastProspectContactAt: { lt: requestCutoff } }],
    },
    proof: { anonymizedAt: { not: null }, proofPurgedAt: null, submittedAt: { lt: monthsAgo(now, r.proofMonths) } },
    audit: { createdAt: { lt: monthsAgo(now, r.auditLogMonths) } },
    opposition: { expiresAt: { lt: now } },
    funnelDay: monthsAgo(now, r.funnelStatsMonths),
  };
}

export async function retentionPreview(settings: SiteSettings, now = new Date()) {
  const c = criteria(settings, now);
  const [cancelled, expired, proofs, auditLogs, oppositions] = await Promise.all([
    prisma.contactRequest.count({ where: c.cancelled }),
    prisma.contactRequest.count({ where: c.expired }),
    prisma.contactRequest.count({ where: c.proof }),
    prisma.auditLog.count({ where: c.audit }),
    prisma.opposition.count({ where: c.opposition }),
  ]);
  return { cancelled, expired, proofs, auditLogs, oppositions };
}

export async function applyRetention(settings: SiteSettings, now = new Date(), actorId: string | null = null): Promise<RetentionReport> {
  const c = criteria(settings, now);
  const report: RetentionReport = {
    cancelledAnonymized: 0,
    expiredAnonymized: 0,
    proofsPurged: 0,
    auditLogsDeleted: 0,
    oppositionsDeleted: 0,
    funnelStatsDeleted: 0,
    sessionsDeleted: 0,
    notificationsDeleted: 0,
    rateLimitsDeleted: 0,
  };

  const cancelled = await prisma.contactRequest.findMany({ where: c.cancelled, select: { id: true }, take: 500 });
  for (const { id } of cancelled) {
    await prisma.$transaction((tx) => anonymizeRequest(tx, id, actorId, "Durée de conservation après annulation écoulée"));
    report.cancelledAnonymized++;
  }
  const expired = await prisma.contactRequest.findMany({ where: c.expired, select: { id: true }, take: 500 });
  for (const { id } of expired) {
    await prisma.$transaction((tx) => anonymizeRequest(tx, id, actorId, "Durée de conservation écoulée"));
    report.expiredAnonymized++;
  }
  const proofs = await prisma.contactRequest.findMany({ where: c.proof, select: { id: true }, take: 500 });
  for (const { id } of proofs) {
    await prisma.$transaction((tx) => purgeProof(tx, id));
    report.proofsPurged++;
  }
  report.auditLogsDeleted = (await prisma.auditLog.deleteMany({ where: c.audit })).count;
  report.oppositionsDeleted = (await prisma.opposition.deleteMany({ where: c.opposition })).count;
  report.funnelStatsDeleted = (await prisma.funnelDailyStat.deleteMany({ where: { day: { lt: c.funnelDay } } })).count;
  report.sessionsDeleted = (
    await prisma.staffSession.deleteMany({ where: { OR: [{ expiresAt: { lt: daysAgo(now, 1) } }, { revokedAt: { lt: daysAgo(now, 30) } }] } })
  ).count;
  report.notificationsDeleted = (
    await prisma.notification.deleteMany({ where: { status: { in: ["SENT", "SKIPPED"] }, createdAt: { lt: daysAgo(now, 90) } } })
  ).count;
  report.rateLimitsDeleted = (await prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } })).count;
  return report;
}
