-- Entreprise du rendez-vous par identifiant, et suivi de l'information des entreprises après une annulation.
ALTER TABLE "ContactRequest" ADD COLUMN "appointmentPartnerId" UUID,
ADD COLUMN "partnerInformRequiredAt" TIMESTAMP(3),
ADD COLUMN "partnerInformedAt" TIMESTAMP(3);

-- Rendez-vous déjà confiés : identifiant retrouvé par la dénomination (ou la dénomination complétée).
UPDATE "ContactRequest" r SET "appointmentPartnerId" = p."id"
FROM "Partner" p
WHERE r."appointmentPartner" IS NOT NULL
  AND (r."appointmentPartner" = p."name" OR r."appointmentPartner" = p."name" || ', ' || p."details");

-- Entreprises reprises de l'ancienne liste libre, jamais revues (critères vides) : désactivées, pour ne pas
-- être nommées d'office dans toutes les demandes. La check-list de mise en ligne invite à les revoir.
UPDATE "Partner" SET "active" = false, "updatedAt" = CURRENT_TIMESTAMP WHERE "criteria" = '{}'::jsonb;
