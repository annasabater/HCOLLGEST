-- Document de dipòsit: factura simplificada sense IVA que continua la numeració
-- de l'estada però no compta com a ingrés (base, IVA i total a 0).
ALTER TABLE "factura" ADD COLUMN "es_diposit" BOOLEAN NOT NULL DEFAULT false;
