-- Tarifes de neteja per registrar el pagament a la dona de neteja.
ALTER TABLE "establiment" ADD COLUMN "preu_neteja_sortida" DECIMAL(10,2);
ALTER TABLE "establiment" ADD COLUMN "preu_neteja_manteniment" DECIMAL(10,2);
ALTER TABLE "establiment" ADD COLUMN "preu_neteja_zones" DECIMAL(10,2);
