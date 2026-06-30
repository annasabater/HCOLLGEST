-- Neteja de factures eliminades de la web però que van quedar a la BD (soft-delete).
-- Les que NO tenen registre Veri*Factu s'esborren de debò (alliberant el número);
-- les que SÍ en tenen (fiscals, legalment conservables) es retolen per alliberar el número.

-- 1) Esborrat real de les factures eliminades sense Veri*Factu.
--    Les línies cauen en cascada; cobraments i dipòsits es desvinculen (ON DELETE SET NULL).
DELETE FROM "factura" f
WHERE f."deleted_at" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "registre_verifactu" r WHERE r."factura_id" = f."id"
  );

-- 2) Les que queden (amb Veri*Factu) es retolen perquè el número es pugui reutilitzar.
UPDATE "factura"
SET "numero" = "numero" || ' (eliminada)'
WHERE "deleted_at" IS NOT NULL
  AND "numero" NOT LIKE '%(eliminada%';
