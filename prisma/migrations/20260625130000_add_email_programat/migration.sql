-- Emails programats: gràcies/ressenya i benvinguda, enviats pel cron diari.
CREATE TABLE IF NOT EXISTS "email_programat" (
    "id" TEXT NOT NULL,
    "estancia_id" TEXT NOT NULL,
    "tipus" TEXT NOT NULL,
    "a" TEXT NOT NULL,
    "nom_destinatari" TEXT,
    "asumpte" TEXT NOT NULL,
    "cos" TEXT NOT NULL,
    "programat_per" TIMESTAMP(3) NOT NULL,
    "enviat_at" TIMESTAMP(3),
    "error_msg" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_programat_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "email_programat_programat_per_idx" ON "email_programat"("programat_per");
CREATE INDEX IF NOT EXISTS "email_programat_enviat_at_idx" ON "email_programat"("enviat_at");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_programat_estancia_id_fkey'
  ) THEN
    ALTER TABLE "email_programat" ADD CONSTRAINT "email_programat_estancia_id_fkey"
    FOREIGN KEY ("estancia_id") REFERENCES "estancia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
