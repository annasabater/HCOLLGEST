-- Import total de l'estada, només de referència (no crea factura ni cobrament).
ALTER TABLE "estancia" ADD COLUMN "import_orientatiu" DECIMAL(10,2);
