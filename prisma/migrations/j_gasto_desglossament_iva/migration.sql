-- Despeses amb diversos tipus d'IVA en una mateixa factura: [{ base, ivaPercent }].
ALTER TABLE "gasto" ADD COLUMN "desglossament_iva" JSONB;
