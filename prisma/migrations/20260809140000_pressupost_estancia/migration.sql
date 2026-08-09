-- Enllaç opcional del pressupost a una estada
ALTER TABLE "pressupost" ADD COLUMN "estancia_id" TEXT;

ALTER TABLE "pressupost"
  ADD CONSTRAINT "pressupost_estancia_id_fkey"
  FOREIGN KEY ("estancia_id") REFERENCES "estancia"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "pressupost_estancia_id_idx" ON "pressupost"("estancia_id");
