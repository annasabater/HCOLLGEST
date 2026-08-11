-- Numeració d'ampliacions sense forats: l'índex únic (any + número) ha d'excloure
-- també les estades ESBORRADES (soft-delete), no només els números buits. Així,
-- quan s'esborra una ampliació, el seu número torna a quedar lliure per reutilitzar
-- i no bloqueja el reús ni deixa un forat permanent.
DROP INDEX IF EXISTS "estancia_any_contracte_num_contracte_key";
CREATE UNIQUE INDEX "estancia_any_contracte_num_contracte_key"
  ON "estancia" ("any_contracte", "num_contracte")
  WHERE "num_contracte" <> '' AND "deleted_at" IS NULL;
