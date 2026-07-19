-- Fiança/dipòsit pagat en una despesa (recuperable): no compta al balanç/P&L
-- fins que es desmarqui (llavors passa a ser despesa real).
ALTER TABLE "gasto" ADD COLUMN "es_fianca" BOOLEAN NOT NULL DEFAULT false;
