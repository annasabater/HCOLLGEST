-- Google Drive: token de refresc xifrat + id de carpeta arrel per a l'export mensual.
ALTER TABLE "establiment" ADD COLUMN "drive_refresh_token_enc" TEXT;
ALTER TABLE "establiment" ADD COLUMN "drive_folder_id" TEXT;
