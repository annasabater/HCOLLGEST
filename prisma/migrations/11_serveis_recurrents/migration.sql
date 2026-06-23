-- CreateEnum
CREATE TYPE "FrequenciaServei" AS ENUM ('MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL', 'BIENNAL', 'PUNTUAL');

-- AlterTable: fitxa de contacte del proveïdor
ALTER TABLE "proveidor" ADD COLUMN "telefon" TEXT;
ALTER TABLE "proveidor" ADD COLUMN "email" TEXT;
ALTER TABLE "proveidor" ADD COLUMN "adreca" TEXT;
ALTER TABLE "proveidor" ADD COLUMN "web" TEXT;
ALTER TABLE "proveidor" ADD COLUMN "activitat" TEXT;
ALTER TABLE "proveidor" ADD COLUMN "notes" TEXT;

-- AlterTable: enllaç de la despesa amb el servei recurrent que la va generar
ALTER TABLE "gasto" ADD COLUMN "servei_recurrent_id" TEXT;

-- CreateTable
CREATE TABLE "servei_recurrent" (
    "id" TEXT NOT NULL,
    "activitat" TEXT NOT NULL,
    "proveidor_id" TEXT,
    "categoria_id" TEXT,
    "frequencia" "FrequenciaServei" NOT NULL DEFAULT 'ANUAL',
    "import_previst" DECIMAL(10,2),
    "metode_pagament" "MetodeCobrament" NOT NULL DEFAULT 'TRANSFERENCIA',
    "propera_data" TIMESTAMP(3) NOT NULL,
    "vigencia_inici" TIMESTAMP(3),
    "vigencia_fi" TIMESTAMP(3),
    "genera_despesa" BOOLEAN NOT NULL DEFAULT true,
    "observacions" TEXT,
    "actiu" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "servei_recurrent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "servei_recurrent_propera_data_idx" ON "servei_recurrent"("propera_data");

-- CreateIndex
CREATE INDEX "servei_recurrent_actiu_idx" ON "servei_recurrent"("actiu");

-- AddForeignKey
ALTER TABLE "servei_recurrent" ADD CONSTRAINT "servei_recurrent_proveidor_id_fkey" FOREIGN KEY ("proveidor_id") REFERENCES "proveidor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servei_recurrent" ADD CONSTRAINT "servei_recurrent_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria_gasto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto" ADD CONSTRAINT "gasto_servei_recurrent_id_fkey" FOREIGN KEY ("servei_recurrent_id") REFERENCES "servei_recurrent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
