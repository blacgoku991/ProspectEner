-- Mise en relation : entreprise partenaire nommée dans la phrase de la demande, avant l'envoi,
-- et première transmission de la demande à cette entreprise (sans clé étrangère : l'entreprise peut être supprimée).
ALTER TABLE "ContactRequest" ADD COLUMN "requestedPartnerId" UUID,
ADD COLUMN "requestedPartnerName" TEXT,
ADD COLUMN "requestedPartnerSentAt" TIMESTAMP(3);

CREATE INDEX "ContactRequest_requestedPartnerId_idx" ON "ContactRequest"("requestedPartnerId");
