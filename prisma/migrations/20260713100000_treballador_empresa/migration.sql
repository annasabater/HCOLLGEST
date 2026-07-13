-- Empresa de neteja: un treballador pot ser una EMPRESA (a qui es paga) i tenir
-- treballadors MEMBRES (a qui s'envien WhatsApps i de qui es registra qui ha vingut).
ALTER TABLE "treballador" ADD COLUMN "es_empresa" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "treballador" ADD COLUMN "empresa_id" TEXT;

CREATE INDEX "treballador_empresa_id_idx" ON "treballador"("empresa_id");

ALTER TABLE "treballador" ADD CONSTRAINT "treballador_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "treballador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
