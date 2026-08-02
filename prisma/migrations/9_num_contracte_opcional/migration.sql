-- Permet DIVERSES estades sense número de contracte (num_contracte = '').
-- Fins ara la unicitat (any + número) també s'aplicava al buit, així que només
-- podia haver-hi UNA estada sense número per any. Ara la unicitat només s'aplica
-- als números REALS: els buits es poden repetir (esborranys que encara no s'han
-- enviat a Mossos i, per tant, no tenen número assignat).
DROP INDEX IF EXISTS "estancia_any_contracte_num_contracte_key";
CREATE UNIQUE INDEX "estancia_any_contracte_num_contracte_key"
  ON "estancia" ("any_contracte", "num_contracte")
  WHERE "num_contracte" <> '';
