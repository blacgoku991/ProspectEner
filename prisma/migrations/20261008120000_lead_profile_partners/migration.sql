-- Profil de la demande (tri et entreprises partenaires) et adresse facultative.
ALTER TABLE "ContactRequest"
  ADD COLUMN "workItems" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "streetAddress" TEXT,
  ADD COLUMN "incomeCategory" TEXT,
  ADD COLUMN "householdSize" INTEGER,
  ADD COLUMN "housingType" TEXT,
  ADD COLUMN "occupancy" TEXT,
  ADD COLUMN "currentHeating" TEXT,
  ADD COLUMN "heatEmitters" TEXT,
  ADD COLUMN "radiatorCount" INTEGER,
  ADD COLUMN "heatedArea" INTEGER,
  ADD COLUMN "boilerLocation" TEXT,
  ADD COLUMN "constructionYearMin" INTEGER,
  ADD COLUMN "constructionYearMax" INTEGER;

CREATE INDEX "ContactRequest_incomeCategory_idx" ON "ContactRequest"("incomeCategory");

-- Demandes existantes : profil recopié depuis les réponses enregistrées.
UPDATE "ContactRequest" SET
  "incomeCategory" = CASE WHEN "answers"->>'income' IN ('TRES_MODESTE', 'MODESTE', 'INTERMEDIAIRE', 'SUPERIEUR') THEN "answers"->>'income' END,
  "householdSize" = CASE WHEN jsonb_typeof("answers"->'householdSize') = 'number' THEN ("answers"->>'householdSize')::INTEGER END,
  "housingType" = "answers"->>'housingType',
  "occupancy" = "answers"->>'occupancy',
  "currentHeating" = NULLIF("answers"->>'currentHeating', 'INCONNU'),
  "constructionYearMin" = CASE "answers"->'construction'->>'kind'
    WHEN 'YEAR' THEN ("answers"->'construction'->>'year')::INTEGER
    WHEN 'PERIOD' THEN ("answers"->'construction'->>'from')::INTEGER
  END,
  "constructionYearMax" = CASE "answers"->'construction'->>'kind'
    WHEN 'YEAR' THEN ("answers"->'construction'->>'year')::INTEGER
    WHEN 'PERIOD' THEN ("answers"->'construction'->>'to')::INTEGER
  END,
  "workItems" = ARRAY(
    SELECT DISTINCT item FROM (
      SELECT jsonb_array_elements_text(
        CASE WHEN "answers"->'works' ? 'ISOLATION' AND jsonb_typeof("answers"->'insulationItems') = 'array' THEN "answers"->'insulationItems' ELSE '[]'::jsonb END
      ) AS item
      UNION ALL SELECT CASE WHEN "answers"->'works' ? 'ISOLATION'
        AND COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof("answers"->'insulationItems') = 'array' THEN "answers"->'insulationItems' END), 0) = 0
        THEN 'ISOLATION_INCONNU' END
      UNION ALL SELECT CASE WHEN "answers"->'works' ? 'PAC' THEN COALESCE("answers"->>'heatPumpType', 'PAC_INCONNU') END
      UNION ALL SELECT CASE WHEN "answers"->'works' ? 'CHAUFFAGE' THEN COALESCE("answers"->>'heatingTarget', 'CHAUFFAGE_INCONNU') END
      UNION ALL SELECT CASE WHEN "answers"->'works' ? 'EAU_CHAUDE' THEN COALESCE("answers"->>'hotWaterTarget', 'EAU_CHAUDE_INCONNU') END
      UNION ALL SELECT CASE WHEN "answers"->'works' ? 'VENTILATION' THEN COALESCE("answers"->>'ventilationTarget', 'VENTILATION_INCONNU') END
      UNION ALL SELECT CASE WHEN "answers"->'works' ? 'RENOVATION_GLOBALE' THEN 'RENOVATION_GLOBALE' END
      UNION ALL SELECT CASE WHEN "answers"->'works' ? 'AUTRE' THEN 'AUTRE_PROJET' END
      UNION ALL SELECT CASE WHEN "answers"->>'oilTankRemoval' = 'OUI' AND "answers"->>'currentHeating' = 'CHAUDIERE_FIOUL'
        AND ("answers"->'works' ? 'PAC' OR "answers"->'works' ? 'CHAUFFAGE') THEN 'DEPOSE_CUVE_FIOUL' END
    ) t
    WHERE item IS NOT NULL
  )
WHERE jsonb_typeof("answers") = 'object';

-- Entreprises partenaires : une ligne par entreprise, avec ses critères de demandes.
CREATE TABLE "Partner" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "details" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "criteria" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Partner_name_key" ON "Partner"("name");

-- Reprise de la liste libre des paramètres (une entreprise par ligne), sans critère : toutes les demandes.
INSERT INTO "Partner" ("id", "name", "active", "criteria", "updatedAt")
SELECT gen_random_uuid(), name, true, '{}'::jsonb, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT left(btrim(line, E' \t\r'), 200) AS name
  FROM "SiteSettings", regexp_split_to_table(COALESCE("data"->'activity'->>'partners', ''), E'\n') AS line
  WHERE btrim(line, E' \t\r') <> ''
) partners
ON CONFLICT ("name") DO NOTHING;
