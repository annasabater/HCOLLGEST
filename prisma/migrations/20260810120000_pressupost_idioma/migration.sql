-- Idioma del document imprès del pressupost (per defecte català)
ALTER TABLE "pressupost" ADD COLUMN "idioma" TEXT NOT NULL DEFAULT 'ca';
