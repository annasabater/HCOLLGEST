-- AlterTable: afegir factura_id a diposit
ALTER TABLE "diposit" ADD COLUMN "factura_id" TEXT;

-- CreateIndex
CREATE INDEX "diposit_factura_id_idx" ON "diposit"("factura_id");

-- AddForeignKey
ALTER TABLE "diposit" ADD CONSTRAINT "diposit_factura_id_fkey"
  FOREIGN KEY ("factura_id") REFERENCES "factura"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
