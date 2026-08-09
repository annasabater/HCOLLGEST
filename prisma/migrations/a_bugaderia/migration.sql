-- Bugaderia: catàleg d'articles + selecció per estada + valors per defecte per habitació.
ALTER TABLE "estancia" ADD COLUMN "bugaderia" JSONB;
ALTER TABLE "habitacio" ADD COLUMN "bugaderia_default" JSONB;

CREATE TABLE "article_bugaderia" (
  "id" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "preu" DECIMAL(10,2) NOT NULL,
  "ordre" INTEGER NOT NULL DEFAULT 0,
  "actiu" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "article_bugaderia_pkey" PRIMARY KEY ("id")
);
