-- Freqüència «Bimestral (cada 2 mesos)» per als serveis recurrents (p. ex. l'aigua).
ALTER TYPE "FrequenciaServei" ADD VALUE IF NOT EXISTS 'BIMESTRAL' AFTER 'MENSUAL';
