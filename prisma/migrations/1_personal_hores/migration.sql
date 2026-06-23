-- AlterTable
ALTER TABLE "treballador" ADD COLUMN     "preu_hora" DECIMAL(10,2),
ALTER COLUMN "dni" DROP NOT NULL;

-- CreateTable
CREATE TABLE "jornada" (
    "id" TEXT NOT NULL,
    "treballador_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "hores" DECIMAL(5,2) NOT NULL,
    "preu_hora" DECIMAL(10,2) NOT NULL,
    "import" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jornada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jornada_treballador_id_idx" ON "jornada"("treballador_id");

-- CreateIndex
CREATE INDEX "jornada_data_idx" ON "jornada"("data");

-- AddForeignKey
ALTER TABLE "jornada" ADD CONSTRAINT "jornada_treballador_id_fkey" FOREIGN KEY ("treballador_id") REFERENCES "treballador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

