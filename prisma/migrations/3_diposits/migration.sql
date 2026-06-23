-- CreateEnum
CREATE TYPE "EstatDiposit" AS ENUM ('EN_CUSTODIA', 'TORNAT', 'RETINGUT');

-- CreateTable
CREATE TABLE "diposit" (
    "id" TEXT NOT NULL,
    "estancia_id" TEXT NOT NULL,
    "import" DECIMAL(10,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "metode" "MetodeCobrament" NOT NULL,
    "estat" "EstatDiposit" NOT NULL DEFAULT 'EN_CUSTODIA',
    "motiu" TEXT,
    "notes" TEXT,
    "data_resolucio" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diposit_estancia_id_idx" ON "diposit"("estancia_id");

-- CreateIndex
CREATE INDEX "diposit_estat_idx" ON "diposit"("estat");

-- AddForeignKey
ALTER TABLE "diposit" ADD CONSTRAINT "diposit_estancia_id_fkey" FOREIGN KEY ("estancia_id") REFERENCES "estancia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

