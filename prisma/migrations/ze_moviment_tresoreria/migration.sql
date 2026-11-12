-- Registre de Deure i Haver de caixa i banc: moviments entrats a mà
-- (saldo inicial, traspassos i altres entrades/sortides).

-- CreateTable
CREATE TABLE "moviment_tresoreria" (
    "id" TEXT NOT NULL,
    "compte" TEXT NOT NULL,
    "tipus" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "import" DECIMAL(10,2) NOT NULL,
    "concepte" TEXT NOT NULL,
    "referencia" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moviment_tresoreria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moviment_tresoreria_data_idx" ON "moviment_tresoreria"("data");
