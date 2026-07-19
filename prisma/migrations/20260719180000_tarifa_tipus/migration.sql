-- Matriu de tarifes per tipus d'habitació + temporada (full de preus estil Excel).
CREATE TABLE "tarifa_tipus" (
  "id" TEXT NOT NULL,
  "grup" TEXT NOT NULL,
  "etiqueta" TEXT NOT NULL,
  "ordre" INTEGER NOT NULL DEFAULT 0,
  "mesos" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "preu_dia" DECIMAL(10,2),
  "preu_dia4" DECIMAL(10,2),
  "preu_setmana" DECIMAL(10,2),
  "preu_dos_setmanes" DECIMAL(10,2),
  "preu_mes" DECIMAL(10,2),
  "reserva" DECIMAL(10,2),
  "nota" TEXT,
  "actiu" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tarifa_tipus_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tarifa_tipus_grup_ordre_idx" ON "tarifa_tipus"("grup", "ordre");

-- Dades inicials (del full de preus 2025-2026). Es poden editar des de la web.
INSERT INTO "tarifa_tipus"
  ("id","grup","etiqueta","ordre","mesos","preu_dia","preu_dia4","preu_setmana","preu_dos_setmanes","preu_mes","reserva","nota","updated_at")
VALUES
  (md5(random()::text||clock_timestamp()::text),'INDIVIDUAL','INVIERNO',1,ARRAY[11,12,1,2,3,4],41,38,175,345,470,NULL,NULL,CURRENT_TIMESTAMP),
  (md5(random()::text||clock_timestamp()::text),'INDIVIDUAL','MAYO',2,ARRAY[5],47,41,200,360,620,NULL,NULL,CURRENT_TIMESTAMP),
  (md5(random()::text||clock_timestamp()::text),'INDIVIDUAL','JUNIO · JULIO · AGOSTO · SEPTIEMBRE',3,ARRAY[6,7,8,9],56,41,270,470,620,NULL,NULL,CURRENT_TIMESTAMP),
  (md5(random()::text||clock_timestamp()::text),'DOBLE_1P','INVIERNO',1,ARRAY[11,12,1,2,3,4],49,NULL,220,370,570,NULL,NULL,CURRENT_TIMESTAMP),
  (md5(random()::text||clock_timestamp()::text),'DOBLE_1P','VERANO (mayo–septiembre)',2,ARRAY[5,6,7,8,9],NULL,NULL,NULL,NULL,NULL,NULL,'Preu segons Habitació Doble (maig a setembre)',CURRENT_TIMESTAMP),
  (md5(random()::text||clock_timestamp()::text),'DOBLE','INVIERNO',1,ARRAY[11,12,1,2,3,4],54,NULL,320,420,620,NULL,NULL,CURRENT_TIMESTAMP),
  (md5(random()::text||clock_timestamp()::text),'DOBLE','MAYO',2,ARRAY[5],59,NULL,330,500,670,NULL,NULL,CURRENT_TIMESTAMP),
  (md5(random()::text||clock_timestamp()::text),'DOBLE','JUNIO · 15–30 SEPTIEMBRE',3,ARRAY[6],70,NULL,350,520,820,NULL,NULL,CURRENT_TIMESTAMP),
  (md5(random()::text||clock_timestamp()::text),'DOBLE','JULIO · AGOSTO · 1–14 SEPTIEMBRE',4,ARRAY[7,8],75,70,450,700,1170,NULL,'70 € a partir del 4t dia',CURRENT_TIMESTAMP),
  (md5(random()::text||clock_timestamp()::text),'DOBLE','SEPTIEMBRE',5,ARRAY[9],NULL,NULL,NULL,NULL,1006,250,'Al juliol es cobra la reserva d''agost i setembre. Reserva de setembre (doble): 250 €.',CURRENT_TIMESTAMP);
