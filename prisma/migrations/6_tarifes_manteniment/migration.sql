-- CreateEnum
CREATE TYPE "EstatIncidencia" AS ENUM ('OBERTA', 'EN_CURS', 'RESOLTA');

-- CreateEnum
CREATE TYPE "PrioritatIncidencia" AS ENUM ('BAIXA', 'MITJA', 'ALTA');

-- CreateTable
CREATE TABLE "tarifa" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "preu_nit" DECIMAL(10,2) NOT NULL,
    "habitacio_id" TEXT,
    "data_inici" TIMESTAMP(3),
    "data_fi" TIMESTAMP(3),
    "actiu" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarifa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidencia" (
    "id" TEXT NOT NULL,
    "titol" TEXT NOT NULL,
    "descripcio" TEXT,
    "habitacio_id" TEXT,
    "estat" "EstatIncidencia" NOT NULL DEFAULT 'OBERTA',
    "prioritat" "PrioritatIncidencia" NOT NULL DEFAULT 'MITJA',
    "cost" DECIMAL(10,2),
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_resolucio" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tarifa_habitacio_id_idx" ON "tarifa"("habitacio_id");

-- CreateIndex
CREATE INDEX "incidencia_habitacio_id_idx" ON "incidencia"("habitacio_id");

-- CreateIndex
CREATE INDEX "incidencia_estat_idx" ON "incidencia"("estat");

-- AddForeignKey
ALTER TABLE "tarifa" ADD CONSTRAINT "tarifa_habitacio_id_fkey" FOREIGN KEY ("habitacio_id") REFERENCES "habitacio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencia" ADD CONSTRAINT "incidencia_habitacio_id_fkey" FOREIGN KEY ("habitacio_id") REFERENCES "habitacio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

