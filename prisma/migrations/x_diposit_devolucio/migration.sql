-- Document de devolució d'un dipòsit (26009.5 → «Devolució del dipòsit 26009.2»).
ALTER TABLE "factura" ADD COLUMN "diposit_devolucio_id" TEXT;

CREATE UNIQUE INDEX "factura_diposit_devolucio_id_key" ON "factura"("diposit_devolucio_id");

ALTER TABLE "factura" ADD CONSTRAINT "factura_diposit_devolucio_id_fkey" FOREIGN KEY ("diposit_devolucio_id") REFERENCES "diposit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
