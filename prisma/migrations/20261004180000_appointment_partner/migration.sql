-- Mise en relation : entreprise qui assure le rendez-vous, accord de la personne et transmission.
ALTER TABLE "ContactRequest" ADD COLUMN "appointmentPartner" TEXT,
ADD COLUMN "partnerConsentAt" TIMESTAMP(3),
ADD COLUMN "partnerSentAt" TIMESTAMP(3);
