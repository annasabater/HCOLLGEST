-- Avisos del taulell descartats manualment ("amaga per sempre").
CREATE TABLE "avis_descartat" (
    "id" TEXT NOT NULL,
    "tipus" TEXT NOT NULL,
    "entitat_id" TEXT NOT NULL,
    "usuari_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "avis_descartat_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "avis_descartat_tipus_entitat_id_key" ON "avis_descartat"("tipus", "entitat_id");
