-- «M'ha de pagar» i «Cobrament pendent» són el mateix: el recordatori apunta al cobrament previst.
ALTER TABLE "recordatori" ADD COLUMN "pagament_previst_id" TEXT;

CREATE UNIQUE INDEX "recordatori_pagament_previst_id_key" ON "recordatori"("pagament_previst_id");

ALTER TABLE "recordatori"
  ADD CONSTRAINT "recordatori_pagament_previst_id_fkey"
  FOREIGN KEY ("pagament_previst_id") REFERENCES "pagament_previst"("id") ON DELETE SET NULL ON UPDATE CASCADE;
