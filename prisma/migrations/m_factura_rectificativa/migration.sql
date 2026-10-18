-- Factures rectificatives en sèrie pròpia (R26-001…): enllaç a la factura que rectifiquen.
ALTER TABLE "factura" ADD COLUMN "rectifica_id" TEXT;

CREATE INDEX "factura_rectifica_id_idx" ON "factura"("rectifica_id");

ALTER TABLE "factura" ADD CONSTRAINT "factura_rectifica_id_fkey" FOREIGN KEY ("rectifica_id") REFERENCES "factura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enllaça les rectificatives ja emeses (total negatiu, p. ex. 26001.1) amb la seva
-- factura original a partir del text de la línia: "Reducción de factura simplificada Nº26001. Motivo: …".
-- No canvia cap número: les factures emeses es queden tal com són.
UPDATE "factura" AS r
SET "rectifica_id" = o."id"
FROM "linia_factura" AS l, "factura" AS o
WHERE l."factura_id" = r."id"
  AND r."total" < 0
  AND r."es_diposit" = false
  AND r."rectifica_id" IS NULL
  AND o."id" <> r."id"
  AND o."numero" = substring(l."descripcio" from 'Nº\s*(\S+?)\.(?:\s|$)');
