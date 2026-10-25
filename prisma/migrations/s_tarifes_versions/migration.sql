-- Historial de versions de la matriu de tarifes (/tarifes).
CREATE TABLE "tarifa_tipus_versio" (
    "id" TEXT NOT NULL,
    "files" JSONB NOT NULL,
    "usuari_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tarifa_tipus_versio_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tarifa_tipus_versio_created_at_idx" ON "tarifa_tipus_versio"("created_at");
