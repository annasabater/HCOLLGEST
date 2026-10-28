-- Devolució / retenció d'un dipòsit o fiança: com s'ha tornat i, si es reté
-- només una part, quant es queda (ingrés sense IVA).
ALTER TABLE "diposit" ADD COLUMN "metode_resolucio" "MetodeCobrament";
ALTER TABLE "diposit" ADD COLUMN "import_retingut" DECIMAL(10,2);
