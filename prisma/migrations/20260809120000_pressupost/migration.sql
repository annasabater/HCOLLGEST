-- Pressupostos (document independent amb numeració pròpia)
CREATE TABLE "pressupost" (
  "id" TEXT NOT NULL,
  "numero" TEXT NOT NULL,
  "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validesa" TIMESTAMP(3),
  "client_nom" TEXT,
  "client_nif" TEXT,
  "client_adreca" TEXT,
  "compte" TEXT,
  "notes" TEXT,
  "base" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "iva_percent" DECIMAL(5,2) NOT NULL DEFAULT 21,
  "iva" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "pressupost_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pressupost_numero_key" ON "pressupost"("numero");

CREATE TABLE "linia_pressupost" (
  "id" TEXT NOT NULL,
  "pressupost_id" TEXT NOT NULL,
  "descripcio" TEXT NOT NULL,
  "import" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "linia_pressupost_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "linia_pressupost_pressupost_id_idx" ON "linia_pressupost"("pressupost_id");
ALTER TABLE "linia_pressupost" ADD CONSTRAINT "linia_pressupost_pressupost_id_fkey" FOREIGN KEY ("pressupost_id") REFERENCES "pressupost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
