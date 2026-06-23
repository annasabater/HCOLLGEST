-- Pagaments a compte de l'estada: un cobrament pot existir SENSE factura
-- (lligat directament a l'estada) i assignar-se a una factura més tard.

-- Camps nous.
ALTER TABLE "cobrament" ADD COLUMN "estancia_id" TEXT;
ALTER TABLE "cobrament" ADD COLUMN "concepte" "ConcepteLinia" NOT NULL DEFAULT 'ALLOTJAMENT';
ALTER TABLE "cobrament" ADD COLUMN "descripcio" TEXT;

-- factura_id passa a opcional + FK amb SET NULL (esborrar la factura no elimina el pagament).
ALTER TABLE "cobrament" ALTER COLUMN "factura_id" DROP NOT NULL;
ALTER TABLE "cobrament" DROP CONSTRAINT IF EXISTS "cobrament_factura_id_fkey";
ALTER TABLE "cobrament" ADD CONSTRAINT "cobrament_factura_id_fkey"
  FOREIGN KEY ("factura_id") REFERENCES "factura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill estancia_id des de la factura existent i fer-lo obligatori.
UPDATE "cobrament" c SET "estancia_id" = f."estancia_id"
FROM "factura" f WHERE c."factura_id" = f."id";
ALTER TABLE "cobrament" ALTER COLUMN "estancia_id" SET NOT NULL;
ALTER TABLE "cobrament" ADD CONSTRAINT "cobrament_estancia_id_fkey"
  FOREIGN KEY ("estancia_id") REFERENCES "estancia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "cobrament_estancia_id_idx" ON "cobrament"("estancia_id");
