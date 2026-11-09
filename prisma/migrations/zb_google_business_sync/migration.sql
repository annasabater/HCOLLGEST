-- Sincronització nocturna de ressenyes amb la Google Business Profile API.
ALTER TABLE "establiment" ADD COLUMN "google_business_token_enc" TEXT;
ALTER TABLE "establiment" ADD COLUMN "google_business_location" TEXT;
ALTER TABLE "establiment" ADD COLUMN "ressenyes_sync_at" TIMESTAMP(3);
ALTER TABLE "establiment" ADD COLUMN "ressenyes_sync_error" TEXT;
