import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import { hashIp } from "./crypto";

/** Actions tracées dans le journal de sécurité. */
export type AuditAction =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAILURE"
  | "AUTH_LOCKED"
  | "AUTH_LOGOUT"
  | "AUTH_MFA_SUCCESS"
  | "AUTH_MFA_FAILURE"
  | "AUTH_MFA_ENROLLED"
  | "AUTH_MFA_RESET"
  | "AUTH_RECOVERY_CODE_USED"
  | "AUTH_PASSWORD_CHANGED"
  | "AUTH_SESSION_REVOKED"
  | "ACCESS_DENIED"
  | "REQUEST_VIEWED"
  | "REQUEST_UPDATED"
  | "REQUEST_ANONYMIZED"
  | "REQUEST_DELETED"
  | "EXPORT_CSV"
  | "SETTINGS_UPDATED"
  | "RULESET_DRAFT_SAVED"
  | "RULESET_PUBLISHED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_SETUP_LINK"
  | "OPPOSITION_ADDED"
  | "OPPOSITION_REMOVED"
  | "ACQUISITION_UPDATED"
  | "RETENTION_APPLIED"
  | "NOTIFICATIONS_RETRIED";

export interface AuditInput {
  actor?: { id: string; email: string } | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  ip?: string | null;
  /** Métadonnées techniques uniquement (jamais de coordonnées ni de réponses). */
  metadata?: Prisma.InputJsonValue;
}

export async function audit(input: AuditInput, tx: Prisma.TransactionClient | typeof prisma = prisma): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: input.actor?.id ?? null,
      actorLabel: input.actor?.email ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      ipHash: hashIp(input.ip ?? null),
      metadata: input.metadata ?? undefined,
    },
  });
}
