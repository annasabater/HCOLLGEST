-- Presentació directa a l'AEAT (PresBasicaDos): certificat xifrat de la titular,
-- entorn (proves/producció) i, a cada declaració presentada des de l'app, el CSV
-- i el PDF del justificant.
ALTER TABLE "establiment" ADD COLUMN "aeat_certificat" TEXT;
ALTER TABLE "establiment" ADD COLUMN "aeat_cert_nif" TEXT;
ALTER TABLE "establiment" ADD COLUMN "aeat_cert_nom" TEXT;
ALTER TABLE "establiment" ADD COLUMN "aeat_cert_caduca" TIMESTAMP(3);
ALTER TABLE "establiment" ADD COLUMN "aeat_entorn" TEXT NOT NULL DEFAULT 'proves';

ALTER TABLE "declaracio_fiscal" ADD COLUMN "csv" TEXT;
ALTER TABLE "declaracio_fiscal" ADD COLUMN "justificant_pdf" TEXT;
