-- Nou tipus de document pujable: carnet de conduir.
ALTER TYPE "TipusDocumentPujat" ADD VALUE IF NOT EXISTS 'CARNET_CONDUIR' BEFORE 'ALTRES';
