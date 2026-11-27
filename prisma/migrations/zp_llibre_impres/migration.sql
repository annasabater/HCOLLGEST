-- Llibre registre: quan es va marcar com a imprès cada contracte (null = per imprimir).
ALTER TABLE "estancia" ADD COLUMN "llibre_impres_el" TIMESTAMP(3);

-- Les estades que ja hi havia compten com a fetes (si no, tot l'historial
-- sortiria de color taronja). Només surten per imprimir les noves i les ampliacions.
UPDATE "estancia" SET "llibre_impres_el" = "created_at";
