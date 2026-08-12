-- Enllaç d'una factura simplificada a la fiscal que la cobreix (per no duplicar
-- l'IVA al llibre: la fiscal s'ensenya a la columna "F." de la simplificada).
ALTER TABLE "factura" ADD COLUMN "factura_fiscal_id" TEXT;
ALTER TABLE "factura" ADD CONSTRAINT "factura_factura_fiscal_id_fkey"
  FOREIGN KEY ("factura_fiscal_id") REFERENCES "factura"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "factura_factura_fiscal_id_idx" ON "factura"("factura_fiscal_id");
