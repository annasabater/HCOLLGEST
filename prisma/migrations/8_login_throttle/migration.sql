-- AlterTable
ALTER TABLE "usuari" ADD COLUMN     "failed_logins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMP(3);

