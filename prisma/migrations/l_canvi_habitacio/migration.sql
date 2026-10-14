-- Canvi d'habitació a mitja estada (mateix contracte): trams d'habitació.
CREATE TABLE "canvi_habitacio" (
    "id" TEXT NOT NULL,
    "estancia_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "habitacio_anterior_id" TEXT,
    "habitacio_nova_id" TEXT,
    "usuari_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "canvi_habitacio_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "canvi_habitacio_estancia_id_idx" ON "canvi_habitacio"("estancia_id");
CREATE INDEX "canvi_habitacio_habitacio_anterior_id_idx" ON "canvi_habitacio"("habitacio_anterior_id");

ALTER TABLE "canvi_habitacio" ADD CONSTRAINT "canvi_habitacio_estancia_id_fkey" FOREIGN KEY ("estancia_id") REFERENCES "estancia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "canvi_habitacio" ADD CONSTRAINT "canvi_habitacio_habitacio_anterior_id_fkey" FOREIGN KEY ("habitacio_anterior_id") REFERENCES "habitacio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "canvi_habitacio" ADD CONSTRAINT "canvi_habitacio_habitacio_nova_id_fkey" FOREIGN KEY ("habitacio_nova_id") REFERENCES "habitacio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
