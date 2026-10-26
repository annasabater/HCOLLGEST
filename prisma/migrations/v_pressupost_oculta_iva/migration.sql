-- Pressupost: opció d'amagar Base i IVA al document imprès (només el Total).
ALTER TABLE "pressupost" ADD COLUMN "oculta_iva" BOOLEAN NOT NULL DEFAULT false;
