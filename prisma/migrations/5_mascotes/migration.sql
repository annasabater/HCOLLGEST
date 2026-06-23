-- CreateEnum
CREATE TYPE "MidaAnimal" AS ENUM ('PETIT', 'MITJA', 'GRAN');

-- AlterTable
ALTER TABLE "animal" ADD COLUMN     "huesped_id" TEXT,
ADD COLUMN     "mida" "MidaAnimal";

-- CreateIndex
CREATE INDEX "animal_huesped_id_idx" ON "animal"("huesped_id");

-- AddForeignKey
ALTER TABLE "animal" ADD CONSTRAINT "animal_huesped_id_fkey" FOREIGN KEY ("huesped_id") REFERENCES "huesped"("id") ON DELETE SET NULL ON UPDATE CASCADE;

