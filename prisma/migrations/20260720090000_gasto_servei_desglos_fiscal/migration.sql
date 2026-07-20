-- AlterTable
ALTER TABLE "gasto" ADD COLUMN "base_imposable" DECIMAL(10,2),
ADD COLUMN "iva_percent" DECIMAL(5,2),
ADD COLUMN "irpf_percent" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "servei_recurrent" ADD COLUMN "base_imposable" DECIMAL(10,2),
ADD COLUMN "iva_percent" DECIMAL(5,2),
ADD COLUMN "irpf_percent" DECIMAL(5,2);
