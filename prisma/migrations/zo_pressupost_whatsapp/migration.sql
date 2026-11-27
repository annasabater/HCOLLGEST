-- Pressupost per WhatsApp: telèfon del client, dates de l'estada i quan s'ha enviat.
ALTER TABLE "pressupost" ADD COLUMN "telefon" TEXT;
ALTER TABLE "pressupost" ADD COLUMN "entrada" TIMESTAMP(3);
ALTER TABLE "pressupost" ADD COLUMN "sortida" TIMESTAMP(3);
ALTER TABLE "pressupost" ADD COLUMN "whatsapp_enviat_el" TIMESTAMP(3);
