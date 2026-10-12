-- Taxa turística per estades (/taxa-turistica): tarifa, màxim de nits i edat mínima.
ALTER TABLE "establiment" ADD COLUMN "ieet_tarifa" DECIMAL(10,2) NOT NULL DEFAULT 0.90;
ALTER TABLE "establiment" ADD COLUMN "ieet_max_nits" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "establiment" ADD COLUMN "ieet_edat_minima" INTEGER NOT NULL DEFAULT 17;
