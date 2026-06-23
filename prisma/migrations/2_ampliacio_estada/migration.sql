-- AlterTable
ALTER TABLE "estancia" ADD COLUMN     "estancia_origen_id" TEXT;

-- AddForeignKey
ALTER TABLE "estancia" ADD CONSTRAINT "estancia_estancia_origen_id_fkey" FOREIGN KEY ("estancia_origen_id") REFERENCES "estancia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

