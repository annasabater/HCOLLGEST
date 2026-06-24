-- Benvinguda als hostes: estat d'enviament per estada + config a l'establiment.
ALTER TABLE "estancia" ADD COLUMN "benvinguda_enviada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "establiment" ADD COLUMN "benvinguda_automatica" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "establiment" ADD COLUMN "benvinguda_tothom" BOOLEAN NOT NULL DEFAULT false;
