-- Habitació "administrativa" per viatger: als papers (llibre de registre,
-- factura) el viatger pot constar en una habitació diferent de la real.
ALTER TABLE "estancia_viatger" ADD COLUMN "habitacio_separada_id" TEXT;

ALTER TABLE "estancia_viatger"
  ADD CONSTRAINT "estancia_viatger_habitacio_separada_id_fkey"
  FOREIGN KEY ("habitacio_separada_id") REFERENCES "habitacio"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
