-- Història de la pròrroga (línia del temps de cada estada al tauler)
-- CreateTable
CREATE TABLE "prorroga_event" (
    "id" TEXT NOT NULL,
    "estancia_id" TEXT NOT NULL,
    "tipus" TEXT NOT NULL,
    "detall" TEXT,
    "usuari_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prorroga_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prorroga_event_estancia_id_created_at_idx" ON "prorroga_event"("estancia_id", "created_at");

-- AddForeignKey
ALTER TABLE "prorroga_event" ADD CONSTRAINT "prorroga_event_estancia_id_fkey" FOREIGN KEY ("estancia_id") REFERENCES "estancia"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Recupera el que ja estava marcat: quan es va preguntar i, si ja hi ha resposta, la resposta.
INSERT INTO "prorroga_event" ("id", "estancia_id", "tipus", "detall", "created_at")
SELECT 'mig-preg-' || "id", "id", 'PREGUNTAT', 'Marcat abans de la línia del temps', "prorroga_preguntat_at"
FROM "estancia" WHERE "prorroga_preguntat_at" IS NOT NULL AND "deleted_at" IS NULL;

INSERT INTO "prorroga_event" ("id", "estancia_id", "tipus", "detall", "created_at")
SELECT 'mig-resp-' || "id", "id", "prorroga_estat", 'Marcat abans de la línia del temps', COALESCE("prorroga_preguntat_at", "updated_at")
FROM "estancia" WHERE "prorroga_estat" IN ('SI', 'NO') AND "deleted_at" IS NULL;
