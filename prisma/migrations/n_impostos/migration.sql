-- Impostos (/impostos): autoliquidacions presentades + referència cadastral del local (model 180).
ALTER TABLE "establiment" ADD COLUMN "referencia_cadastral" TEXT;

CREATE TABLE "declaracio_fiscal" (
  "id" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "any" INTEGER NOT NULL,
  "periode" INTEGER NOT NULL,
  "caselles" JSONB NOT NULL,
  "justificant" TEXT,
  "presentada_el" TIMESTAMP(3) NOT NULL,
  "usuari_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "declaracio_fiscal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "declaracio_fiscal_model_any_periode_key" ON "declaracio_fiscal"("model", "any", "periode");

-- 2T 2026 ja presentats (abans d'existir /impostos): xifres i justificants dels
-- impresos de l'AEAT. El 3T en llegeix la casella 05 del 130 (428,86).
INSERT INTO "declaracio_fiscal" ("id", "model", "any", "periode", "caselles", "justificant", "presentada_el", "updated_at") VALUES
  ('decl-303-2026-2', '303', 2026, 2,
   '{"04":2161.85,"05":10,"06":216.19,"27":216.19,"28":17.56,"29":3.69,"45":3.69,"46":212.5,"64":212.5,"65":100,"66":212.5,"69":212.5,"71":212.5}',
   '3036469834386', '2026-07-20', CURRENT_TIMESTAMP),
  ('decl-130-2026-2', '130', 2026, 2,
   '{"01":2161.85,"02":17.56,"03":2144.29,"04":428.86,"05":0,"06":0,"07":428.86,"12":428.86,"13":0,"14":428.86,"15":0,"16":0,"17":428.86,"18":0,"19":428.86}',
   '1306469854593', '2026-07-20', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Categories de gasto sense IVA que només resten al 130 (quota d'autònoms, SS).
INSERT INTO "categoria_gasto" ("id", "nom", "updated_at") VALUES
  ('cat-autonoms', 'Autònoms', CURRENT_TIMESTAMP),
  ('cat-seguretat-social', 'Seguretat Social', CURRENT_TIMESTAMP)
ON CONFLICT ("nom") DO NOTHING;
