-- Segona línia (detall) del concepte d'una línia de factura; null = sense editar.
ALTER TABLE "linia_factura" ADD COLUMN "detall" TEXT;
-- Quantitat mostrada (preu = import / quantitat); null = 1.
ALTER TABLE "linia_factura" ADD COLUMN "quantitat" DECIMAL(10,2);

-- Edicions manuals dels documents imprimibles (tot el que no té camp propi).
CREATE TABLE "edicio_document" (
    "id" TEXT NOT NULL,
    "tipus" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "dades" JSONB NOT NULL,
    "usuari_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "edicio_document_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "edicio_document_tipus_ref_key" ON "edicio_document"("tipus", "ref");
