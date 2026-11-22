-- Consultes desades de la llista de despeses (filtres + comparació).
CREATE TABLE "consulta_despeses" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "filtres" JSONB NOT NULL,
    "comparacio" TEXT NOT NULL DEFAULT 'CAP',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consulta_despeses_pkey" PRIMARY KEY ("id")
);
