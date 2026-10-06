-- Distingeix els DIPÒSITS de les fiances: un dipòsit es documenta a mà amb una
-- «Factura de dipòsit» des de Facturació (ja no es crea sol en registrar-lo).
ALTER TABLE "diposit" ADD COLUMN "es_diposit" BOOLEAN NOT NULL DEFAULT false;

-- Els que ja tenen document de dipòsit són dipòsits.
UPDATE "diposit" SET "es_diposit" = true
WHERE "factura_id" IN (SELECT "id" FROM "factura" WHERE "es_diposit" = true);
