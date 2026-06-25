-- Afegeix tarifes per tasques de neteja al model Treballador.
-- Alternativa al preu/hora: cada treballador pot cobrar per sortida, manteniment i zones.
ALTER TABLE "treballador" ADD COLUMN IF NOT EXISTS "preu_sortida" DECIMAL(10,2);
ALTER TABLE "treballador" ADD COLUMN IF NOT EXISTS "preu_manteniment" DECIMAL(10,2);
ALTER TABLE "treballador" ADD COLUMN IF NOT EXISTS "preu_zones" DECIMAL(10,2);
