-- Neteja planificada (encara no feta) i observacions del dia / de la setmana.
CREATE TYPE "AmbitNotaNeteja" AS ENUM ('DIA', 'SETMANA');

CREATE TABLE "neteja_planificada" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "habitacio_id" TEXT NOT NULL,
    "tipus" "TipusNeteja" NOT NULL,
    "treballador_id" TEXT,
    "nota" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "neteja_planificada_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "neteja_planificada_data_habitacio_id_key" ON "neteja_planificada"("data", "habitacio_id");
CREATE INDEX "neteja_planificada_data_idx" ON "neteja_planificada"("data");
ALTER TABLE "neteja_planificada" ADD CONSTRAINT "neteja_planificada_habitacio_id_fkey" FOREIGN KEY ("habitacio_id") REFERENCES "habitacio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "neteja_planificada" ADD CONSTRAINT "neteja_planificada_treballador_id_fkey" FOREIGN KEY ("treballador_id") REFERENCES "treballador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "nota_neteja" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "ambit" "AmbitNotaNeteja" NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nota_neteja_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "nota_neteja_data_ambit_key" ON "nota_neteja"("data", "ambit");
