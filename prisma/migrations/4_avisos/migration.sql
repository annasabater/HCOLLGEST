-- CreateEnum
CREATE TYPE "GravetatAvis" AS ENUM ('BAIXA', 'MITJA', 'ALTA');

-- CreateTable
CREATE TABLE "avis" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telefon" TEXT,
    "email" TEXT,
    "motiu" TEXT NOT NULL,
    "gravetat" "GravetatAvis" NOT NULL DEFAULT 'MITJA',
    "notes" TEXT,
    "actiu" BOOLEAN NOT NULL DEFAULT true,
    "usuari_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "avis_telefon_idx" ON "avis"("telefon");

-- CreateIndex
CREATE INDEX "avis_actiu_idx" ON "avis"("actiu");

