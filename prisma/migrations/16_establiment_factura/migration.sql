-- Dades de l'emissor i del pagament per a la factura impresa.
ALTER TABLE "establiment" ADD COLUMN "rao_social" TEXT;
ALTER TABLE "establiment" ADD COLUMN "adreca" TEXT;
ALTER TABLE "establiment" ADD COLUMN "codi_postal" TEXT;
ALTER TABLE "establiment" ADD COLUMN "poblacio" TEXT;
ALTER TABLE "establiment" ADD COLUMN "telefon" TEXT;
ALTER TABLE "establiment" ADD COLUMN "iban" TEXT;
ALTER TABLE "establiment" ADD COLUMN "descriptor" TEXT;
