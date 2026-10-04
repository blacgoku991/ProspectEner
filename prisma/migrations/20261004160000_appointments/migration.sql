-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'RDV_FIXE' AFTER 'CONTACTE';

-- AlterTable
ALTER TABLE "ContactRequest" ADD COLUMN     "appointmentAt" TIMESTAMP(3),
ADD COLUMN     "appointmentMode" TEXT,
ADD COLUMN     "appointmentNote" TEXT,
ADD COLUMN     "qualification" JSONB,
ADD COLUMN     "qualifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ContactRequest_appointmentAt_idx" ON "ContactRequest"("appointmentAt");
