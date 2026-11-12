-- Recordatoris propis (assegurança, revisions…) i resum diari per WhatsApp.

-- AlterTable
ALTER TABLE "establiment" ADD COLUMN     "whatsapp_actiu" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsapp_api_key_enc" TEXT,
ADD COLUMN     "whatsapp_error" TEXT,
ADD COLUMN     "whatsapp_resum_dia" TEXT,
ADD COLUMN     "whatsapp_telefon" TEXT;

-- CreateTable
CREATE TABLE "recordatori" (
    "id" TEXT NOT NULL,
    "titol" TEXT NOT NULL,
    "notes" TEXT,
    "tipus" TEXT NOT NULL DEFAULT 'ALTRES',
    "data" DATE NOT NULL,
    "repeticio_cada" INTEGER,
    "repeticio_unitat" TEXT,
    "dies_abans" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "whatsapp" BOOLEAN NOT NULL DEFAULT true,
    "ajornat_fins" DATE,
    "ajornaments" INTEGER NOT NULL DEFAULT 0,
    "fet_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recordatori_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recordatori_data_idx" ON "recordatori"("data");

-- CreateIndex
CREATE INDEX "recordatori_fet_at_idx" ON "recordatori"("fet_at");
