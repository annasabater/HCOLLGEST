-- «Marxarà abans»: sortida probable (sense tocar la sortida oficial) i nota.
ALTER TABLE "estancia" ADD COLUMN "sortida_probable" TIMESTAMP(3);
ALTER TABLE "estancia" ADD COLUMN "sortida_probable_nota" TEXT;
