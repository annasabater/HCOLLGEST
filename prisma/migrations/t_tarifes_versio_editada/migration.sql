-- Els desats d'uns quants dies s'acumulen a la mateixa versió de tarifes: data de l'últim.
ALTER TABLE "tarifa_tipus_versio" ADD COLUMN "editada_el" TIMESTAMP(3);
