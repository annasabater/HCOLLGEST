-- AlterTable
ALTER TABLE "establiment" ADD COLUMN     "factura_titular" TEXT,
ADD COLUMN     "factura_nif" TEXT;

-- AlterTable
ALTER TABLE "factura" ADD COLUMN     "client_nom" TEXT,
ADD COLUMN     "client_nif" TEXT,
ADD COLUMN     "client_adreca" TEXT,
ADD COLUMN     "client_localitat" TEXT,
ADD COLUMN     "emissor_titular" TEXT,
ADD COLUMN     "emissor_nif" TEXT,
ADD COLUMN     "emissor_adreca" TEXT,
ADD COLUMN     "emissor_localitat" TEXT;
