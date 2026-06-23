-- Descartar l'avís del termini de Mossos (24 h) al tauler, per estada.
ALTER TABLE "estancia" ADD COLUMN "avis_mossos_parat" BOOLEAN NOT NULL DEFAULT false;
