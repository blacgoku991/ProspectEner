-- AlterTable
ALTER TABLE "ContactRequest" ADD COLUMN     "contactAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastContactAttemptAt" TIMESTAMP(3),
ADD COLUMN     "lastProspectContactAt" TIMESTAMP(3);
