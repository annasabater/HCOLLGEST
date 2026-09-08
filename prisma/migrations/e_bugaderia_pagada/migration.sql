-- La bugaderia d'una tasca de neteja també es cobra a qui l'ha feta: cal poder
-- marcar-la com a pagada, igual que una jornada. null = pendent de pagar.
ALTER TABLE "tasca_neteja" ADD COLUMN "bugaderia_pagada_el" TIMESTAMP(3);
