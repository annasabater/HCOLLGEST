-- Control de pagament de les jornades del personal (p. ex. la dona de neteja).
ALTER TABLE "jornada" ADD COLUMN "pagada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "jornada" ADD COLUMN "data_pagament" TIMESTAMP(3);
