-- Avís de pròrroga d'estada al tauler i recordatori de sortida.
ALTER TABLE "estancia" ADD COLUMN "prorroga_estat" TEXT;
ALTER TABLE "estancia" ADD COLUMN "prorroga_sortida" TIMESTAMP(3);
ALTER TABLE "estancia" ADD COLUMN "prorroga_preguntat_at" TIMESTAMP(3);
ALTER TABLE "estancia" ADD COLUMN "prorroga_aplacat_fins" TIMESTAMP(3);
ALTER TABLE "estancia" ADD COLUMN "recordatori_sortida" TIMESTAMP(3);
