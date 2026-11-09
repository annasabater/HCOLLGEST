-- Ressenyes de Google moderades a /ressenyes i publicades a hostalcoll.com.
CREATE TYPE "EstatRessenya" AS ENUM ('PENDENT', 'PUBLICADA', 'AMAGADA');

CREATE TABLE "ressenya" (
    "id" TEXT NOT NULL,
    "font" TEXT NOT NULL DEFAULT 'MANUAL',
    "google_id" TEXT,
    "autor" TEXT NOT NULL,
    "puntuacio" INTEGER NOT NULL,
    "text" TEXT,
    "idioma" TEXT,
    "data_ressenya" TIMESTAMP(3) NOT NULL,
    "resposta" TEXT,
    "estat" "EstatRessenya" NOT NULL DEFAULT 'PENDENT',
    "destacada" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "publicada_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ressenya_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ressenya_google_id_key" ON "ressenya"("google_id");
CREATE INDEX "ressenya_estat_idx" ON "ressenya"("estat");

-- Resum real de la fitxa de Google (nota mitjana, total i enllaç).
ALTER TABLE "establiment" ADD COLUMN "google_nota" DECIMAL(2,1);
ALTER TABLE "establiment" ADD COLUMN "google_total" INTEGER;
ALTER TABLE "establiment" ADD COLUMN "google_url" TEXT;
