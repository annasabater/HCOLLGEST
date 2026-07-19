-- Llibre d'IVA trimestral (ingressos) desat: instantània editable per trimestre.
CREATE TABLE "llibre_iva_trimestre" (
  "id" TEXT NOT NULL,
  "periode" TEXT NOT NULL,
  "any" INTEGER NOT NULL,
  "trimestre" INTEGER NOT NULL,
  "etiqueta" TEXT NOT NULL,
  "files" JSONB NOT NULL,
  "totalBase" DECIMAL(12,2) NOT NULL,
  "totalIva" DECIMAL(12,2) NOT NULL,
  "totalTotal" DECIMAL(12,2) NOT NULL,
  "usuari_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "llibre_iva_trimestre_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "llibre_iva_trimestre_periode_key" ON "llibre_iva_trimestre"("periode");
