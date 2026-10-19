-- Contrasenya del certificat de l'AEAT, xifrada, si la titular vol que es recordi.
ALTER TABLE "establiment" ADD COLUMN "aeat_cert_contrasenya" TEXT;
