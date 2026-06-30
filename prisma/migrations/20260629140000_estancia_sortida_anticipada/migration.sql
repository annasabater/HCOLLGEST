ALTER TABLE "estancia" ADD COLUMN "sortida_anticipada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "estancia" ADD COLUMN "data_sortida_prevista" TIMESTAMP(3);
