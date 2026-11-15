-- Recordatoris «fixos» (pagaments/serveis fixos): surten a la pestanya «Fixes».
ALTER TABLE "recordatori" ADD COLUMN "fix" BOOLEAN NOT NULL DEFAULT false;
-- Els que ja es repeteixen són fixos, menys les neteges de la Mireia (personal).
UPDATE "recordatori" SET "fix" = true
WHERE "repeticio_cada" IS NOT NULL AND "deleted_at" IS NULL AND "titol" NOT ILIKE '%MIREIA%';
