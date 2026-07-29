-- Consentiment de comunicacions comercials (LOPD) capturat en signar el
-- reglament; es reflecteix a les caselles del PDF del reglament.
ALTER TABLE "signatura" ADD COLUMN "refusa_comercial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "autoritza_comercial_altres" BOOLEAN NOT NULL DEFAULT false;
