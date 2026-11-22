-- Notes a mà dels contractes del full d'Ocupació.
CREATE TABLE "nota_ocupacio" (
    "clau" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nota_ocupacio_pkey" PRIMARY KEY ("clau")
);
