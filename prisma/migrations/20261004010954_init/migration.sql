-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'COLLABORATOR');

-- CreateEnum
CREATE TYPE "RequestKind" AS ENUM ('SIMULATION', 'QUICK_CALLBACK');

-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('PHONE', 'EMAIL');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NOUVEAU', 'A_VERIFIER', 'CONTACTE', 'ETUDE_EN_COURS', 'TERMINE', 'SANS_SUITE', 'CONTACT_ANNULE');

-- CreateEnum
CREATE TYPE "OverallOutcome" AS ENUM ('POTENTIALLY_ELIGIBLE', 'NEEDS_REVIEW', 'NOT_ELIGIBLE', 'OUT_OF_SCOPE', 'NOT_EVALUATED');

-- CreateEnum
CREATE TYPE "AcquisitionOrigin" AS ENUM ('DIRECT', 'AUTHORIZED_CAMPAIGN', 'UNLISTED_CAMPAIGN', 'NOT_COLLECTED');

-- CreateEnum
CREATE TYPE "TextKind" AS ENUM ('CONTACT_NOTICE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RuleSetStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "passwordHash" TEXT,
    "passwordChangedAt" TIMESTAMP(3),
    "mfaSecretEnc" TEXT,
    "mfaEnabledAt" TIMESTAMP(3),
    "mfaLastUsedStep" BIGINT,
    "recoveryCodeHashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "canExport" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "setupTokenHash" TEXT,
    "setupTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSession" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "mfaVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactRequest" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "kind" "RequestKind" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'NOUVEAU',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "channel" "ContactChannel" NOT NULL,
    "availability" JSONB,
    "comment" TEXT,
    "postalCode" TEXT,
    "communeName" TEXT,
    "communeInsee" TEXT,
    "departement" TEXT,
    "territory" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "projectTypes" TEXT[],
    "evaluation" JSONB,
    "overallOutcome" "OverallOutcome" NOT NULL,
    "engineVersion" TEXT,
    "ruleSetVersion" TEXT,
    "ruleSetId" UUID,
    "evaluatedAt" TIMESTAMP(3),
    "requestSentence" TEXT NOT NULL,
    "noticeTextId" UUID NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "phoneHash" TEXT,
    "emailHash" TEXT,
    "acquisitionOrigin" "AcquisitionOrigin" NOT NULL,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "landingPath" TEXT,
    "referrerHost" TEXT,
    "callbackDeadline" TIMESTAMP(3),
    "firstContactAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cancelTokenHash" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "oppositionMatch" BOOLEAN NOT NULL DEFAULT false,
    "assignedToId" UUID,
    "anonymizedAt" TIMESTAMP(3),
    "proofPurgedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextVersion" (
    "id" UUID NOT NULL,
    "kind" "TextKind" NOT NULL,
    "hash" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalNote" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "authorId" UUID,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestEvent" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "actorId" UUID,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "requestId" UUID,
    "event" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleSet" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "status" "RuleSetStatus" NOT NULL,
    "data" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "notes" TEXT,
    "basedOnId" UUID,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishedById" UUID,
    "publicationNote" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "RuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opposition" (
    "id" UUID NOT NULL,
    "phoneHash" TEXT,
    "emailHash" TEXT,
    "maskedValue" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Opposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcquisitionChannel" (
    "id" UUID NOT NULL,
    "campaign" TEXT NOT NULL,
    "source" TEXT,
    "medium" TEXT,
    "label" TEXT NOT NULL,
    "authorizationNote" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcquisitionChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "actorLabel" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "ipHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "FunnelDailyStat" (
    "day" DATE NOT NULL,
    "step" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FunnelDailyStat_pkey" PRIMARY KEY ("day","step")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_setupTokenHash_key" ON "StaffUser"("setupTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "StaffSession_tokenHash_key" ON "StaffSession"("tokenHash");

-- CreateIndex
CREATE INDEX "StaffSession_userId_idx" ON "StaffSession"("userId");

-- CreateIndex
CREATE INDEX "StaffSession_expiresAt_idx" ON "StaffSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContactRequest_reference_key" ON "ContactRequest"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ContactRequest_idempotencyKey_key" ON "ContactRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ContactRequest_status_createdAt_idx" ON "ContactRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContactRequest_createdAt_idx" ON "ContactRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ContactRequest_assignedToId_idx" ON "ContactRequest"("assignedToId");

-- CreateIndex
CREATE INDEX "ContactRequest_overallOutcome_idx" ON "ContactRequest"("overallOutcome");

-- CreateIndex
CREATE INDEX "ContactRequest_departement_idx" ON "ContactRequest"("departement");

-- CreateIndex
CREATE INDEX "ContactRequest_callbackDeadline_idx" ON "ContactRequest"("callbackDeadline");

-- CreateIndex
CREATE INDEX "ContactRequest_lastActivityAt_idx" ON "ContactRequest"("lastActivityAt");

-- CreateIndex
CREATE UNIQUE INDEX "TextVersion_hash_key" ON "TextVersion"("hash");

-- CreateIndex
CREATE INDEX "InternalNote_requestId_createdAt_idx" ON "InternalNote"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestEvent_requestId_createdAt_idx" ON "RequestEvent"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_status_nextAttemptAt_idx" ON "Notification"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "RuleSet_version_key" ON "RuleSet"("version");

-- CreateIndex
CREATE INDEX "RuleSet_status_idx" ON "RuleSet"("status");

-- CreateIndex
CREATE INDEX "Opposition_phoneHash_idx" ON "Opposition"("phoneHash");

-- CreateIndex
CREATE INDEX "Opposition_emailHash_idx" ON "Opposition"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "AcquisitionChannel_campaign_key" ON "AcquisitionChannel"("campaign");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- AddForeignKey
ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "RuleSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_noticeTextId_fkey" FOREIGN KEY ("noticeTextId") REFERENCES "TextVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ContactRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestEvent" ADD CONSTRAINT "RequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ContactRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestEvent" ADD CONSTRAINT "RequestEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ContactRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- Contraintes complémentaires (non exprimables dans le schéma Prisma)
-- ─────────────────────────────────────────────────────────────

-- Un seul jeu de règles publié à la fois.
CREATE UNIQUE INDEX "RuleSet_single_published" ON "RuleSet" ("status") WHERE "status" = 'PUBLISHED';

-- Le singleton des paramètres ne peut avoir que l'identifiant 1.
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_singleton" CHECK ("id" = 1);

-- Un e-mail est requis pour une réponse par e-mail, un téléphone pour un rappel (hors fiches anonymisées).
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_channel_contact" CHECK (
  "anonymizedAt" IS NOT NULL
  OR ("channel" = 'EMAIL' AND "email" IS NOT NULL)
  OR ("channel" = 'PHONE' AND "phone" IS NOT NULL)
);

-- Compteurs positifs.
ALTER TABLE "RateLimitBucket" ADD CONSTRAINT "RateLimitBucket_count_positive" CHECK ("count" >= 0);
ALTER TABLE "FunnelDailyStat" ADD CONSTRAINT "FunnelDailyStat_count_positive" CHECK ("count" >= 0);
