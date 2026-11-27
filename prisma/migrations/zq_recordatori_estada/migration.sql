-- Recordatori lligat a una estada (amb l'acció que proposa el tauler i, si cal, l'import).
ALTER TABLE "recordatori" ADD COLUMN "estancia_id" TEXT;
ALTER TABLE "recordatori" ADD COLUMN "accio" TEXT;
ALTER TABLE "recordatori" ADD COLUMN "import" DECIMAL(10,2);

ALTER TABLE "recordatori"
  ADD CONSTRAINT "recordatori_estancia_id_fkey"
  FOREIGN KEY ("estancia_id") REFERENCES "estancia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "recordatori_estancia_id_idx" ON "recordatori"("estancia_id");
