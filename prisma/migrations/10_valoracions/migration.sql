-- CreateTable
CREATE TABLE "valoracio" (
    "id" TEXT NOT NULL,
    "puntuacio" INTEGER NOT NULL,
    "comentari" TEXT,
    "nom" TEXT,
    "habitacio" TEXT,
    "idioma" TEXT,
    "estancia_id" TEXT,
    "vista" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "valoracio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "valoracio_vista_idx" ON "valoracio"("vista");

-- CreateIndex
CREATE INDEX "valoracio_created_at_idx" ON "valoracio"("created_at");
