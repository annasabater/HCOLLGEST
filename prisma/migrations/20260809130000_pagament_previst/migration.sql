-- Cobraments previstos/pendents (avís al tauler el dia abans)
CREATE TABLE "pagament_previst" (
  "id" TEXT NOT NULL,
  "estancia_id" TEXT NOT NULL,
  "import" DECIMAL(10,2) NOT NULL,
  "data_prevista" TIMESTAMP(3) NOT NULL,
  "concepte" TEXT,
  "pagat" BOOLEAN NOT NULL DEFAULT false,
  "data_pagament" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pagament_previst_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pagament_previst_estancia_id_idx" ON "pagament_previst"("estancia_id");
CREATE INDEX "pagament_previst_data_prevista_idx" ON "pagament_previst"("data_prevista");
ALTER TABLE "pagament_previst" ADD CONSTRAINT "pagament_previst_estancia_id_fkey" FOREIGN KEY ("estancia_id") REFERENCES "estancia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
