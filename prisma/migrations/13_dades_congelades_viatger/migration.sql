-- Snapshot de les dades del viatger per estada (per no reescriure el llibre
-- de viatgers passat quan s'edita la fitxa d'un hoste).
ALTER TABLE "estancia_viatger" ADD COLUMN "dades_congelades" JSONB;
