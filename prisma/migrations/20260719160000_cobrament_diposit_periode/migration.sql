-- CreateTable
CREATE TABLE "cobrament_periode" (
    "id" TEXT NOT NULL,
    "cobrament_id" TEXT NOT NULL,
    "data_inici" TIMESTAMP(3) NOT NULL,
    "data_fi" TIMESTAMP(3) NOT NULL,
    "import" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cobrament_periode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diposit_periode" (
    "id" TEXT NOT NULL,
    "diposit_id" TEXT NOT NULL,
    "data_inici" TIMESTAMP(3) NOT NULL,
    "data_fi" TIMESTAMP(3) NOT NULL,
    "import" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diposit_periode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cobrament_periode_cobrament_id_idx" ON "cobrament_periode"("cobrament_id");

-- CreateIndex
CREATE INDEX "diposit_periode_diposit_id_idx" ON "diposit_periode"("diposit_id");

-- AddForeignKey
ALTER TABLE "cobrament_periode" ADD CONSTRAINT "cobrament_periode_cobrament_id_fkey" FOREIGN KEY ("cobrament_id") REFERENCES "cobrament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diposit_periode" ADD CONSTRAINT "diposit_periode_diposit_id_fkey" FOREIGN KEY ("diposit_id") REFERENCES "diposit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
