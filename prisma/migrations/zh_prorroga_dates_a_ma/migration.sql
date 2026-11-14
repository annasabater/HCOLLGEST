-- Estades en curs: dia triat a ma per preguntar si allarga i per al recordatori de sortida.
ALTER TABLE "estancia" ADD COLUMN "prorroga_preguntar_el" TIMESTAMP(3);
ALTER TABLE "estancia" ADD COLUMN "recordatori_sortida_el" TIMESTAMP(3);
