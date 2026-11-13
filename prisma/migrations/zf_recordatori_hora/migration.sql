-- Hora pròpia dels recordatoris (avís a aquella hora en comptes del resum del matí)
ALTER TABLE "recordatori" ADD COLUMN "hora" TEXT;
ALTER TABLE "recordatori" ADD COLUMN "avisat_dia" TEXT;
