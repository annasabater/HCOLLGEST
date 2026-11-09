-- Precisió de la data de la ressenya (DIA | MES | ANY).
ALTER TABLE "ressenya" ADD COLUMN "data_precisio" TEXT NOT NULL DEFAULT 'DIA';
