-- Notificacions push al mòbil i Google Calendar dels recordatoris.

-- AlterTable
ALTER TABLE "establiment" ADD COLUMN     "calendari_sync_error" TEXT,
ADD COLUMN     "google_calendar_id" TEXT,
ADD COLUMN     "google_calendar_token_enc" TEXT;

-- AlterTable
ALTER TABLE "recordatori" ADD COLUMN     "calendari" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "google_event_id" TEXT;

-- CreateTable
CREATE TABLE "push_subscripcio" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "usuari_id" TEXT,
    "resum_mati" BOOLEAN NOT NULL DEFAULT true,
    "al_moment" BOOLEAN NOT NULL DEFAULT true,
    "darrer_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscripcio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscripcio_endpoint_key" ON "push_subscripcio"("endpoint");

