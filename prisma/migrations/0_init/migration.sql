-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RECEPCIO', 'CONSULTA');

-- CreateEnum
CREATE TYPE "TipusRegistre" AS ENUM ('CONTRACTE_EN_CURS', 'RESERVA');

-- CreateEnum
CREATE TYPE "EstatEstancia" AS ENUM ('RESERVA', 'EN_CURS', 'FINALITZADA', 'CANCELLADA');

-- CreateEnum
CREATE TYPE "TipusDocument" AS ENUM ('DNI_NIF', 'NIE', 'PASSAPORT', 'ALTRES');

-- CreateEnum
CREATE TYPE "Sexe" AS ENUM ('HOME', 'DONA');

-- CreateEnum
CREATE TYPE "TipusPagament" AS ENUM ('DESTINACIO', 'EFECTIU', 'MOBIL', 'PLATAFORMA', 'TARGETA_CREDIT', 'TRANSFERENCIA', 'TARGETA_REGAL');

-- CreateEnum
CREATE TYPE "EstatEnviament" AS ENUM ('PENDENT', 'ENVIAT', 'ACCEPTAT', 'REBUTJAT', 'ERROR');

-- CreateEnum
CREATE TYPE "Parentesc" AS ENUM ('AVI_AVIA', 'BESAVI_BESAVIA', 'BESNET_BESNETA', 'CUNYAT_CUNYADA', 'CONJUGE', 'FILL_FILLA', 'GERMA_GERMANA', 'NET_NETA', 'PARE_MARE', 'NEBOT_NEBODA', 'SOGRE_SOGRA', 'ONCLE_TIA', 'TUTOR_TUTORA', 'GENDRE_NORA', 'ALTRES');

-- CreateEnum
CREATE TYPE "TipusDocumentPujat" AS ENUM ('DNI_ANVERS', 'DNI_REVERS', 'PASSAPORT', 'NIE', 'RESIDENCIA', 'ALTRES');

-- CreateEnum
CREATE TYPE "SentitAnotacio" AS ENUM ('POSITIVA', 'NEGATIVA', 'NEUTRA');

-- CreateEnum
CREATE TYPE "AccioAudit" AS ENUM ('CREACIO', 'MODIFICACIO', 'ELIMINACIO', 'ENVIAMENT', 'FIRMA', 'IMPRESSIO', 'DESCARREGA', 'ACCES', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "MetodeCobrament" AS ENUM ('EFECTIU', 'TARGETA', 'TRANSFERENCIA', 'BIZUM', 'ALTRES');

-- CreateEnum
CREATE TYPE "EstatFactura" AS ENUM ('PENDENT', 'COBRADA');

-- CreateEnum
CREATE TYPE "TipusDocumentFiscal" AS ENUM ('RECIBO', 'FACTURA', 'FACTURA_SIMPLIFICADA');

-- CreateEnum
CREATE TYPE "TipusFacturaVerifactu" AS ENUM ('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5');

-- CreateEnum
CREATE TYPE "EstatVerifactu" AS ENUM ('GENERAT', 'ENVIAT', 'ACCEPTAT', 'ANULLAT', 'ERROR');

-- CreateEnum
CREATE TYPE "ConcepteLinia" AS ENUM ('ALLOTJAMENT', 'EXTRA', 'DESCOMPTE', 'TASA');

-- CreateEnum
CREATE TYPE "TipusNeteja" AS ENUM ('CANVI_COMPLET', 'REPAS');

-- CreateEnum
CREATE TYPE "EstatTasca" AS ENUM ('PENDENT', 'FETA');

-- CreateEnum
CREATE TYPE "EstatActiu" AS ENUM ('NOU', 'BO', 'REGULAR', 'SUBSTITUCIO_RECOMANADA', 'OBSOLET');

-- CreateEnum
CREATE TYPE "TipusHistorialActiu" AS ENUM ('REPARACIO', 'AVARIA', 'CANVI_UBICACIO', 'SUBSTITUCIO');

-- CreateEnum
CREATE TYPE "TipusAbsencia" AS ENUM ('VACANCES', 'BAIXA', 'ALTRES');

-- CreateTable
CREATE TABLE "establiment" (
    "id" TEXT NOT NULL,
    "id_policial" TEXT NOT NULL,
    "file_identifier" TEXT,
    "nom" TEXT NOT NULL,
    "cif" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "encoding" TEXT NOT NULL DEFAULT 'latin1',
    "mossos_user" TEXT,
    "mossos_pass_enc" TEXT,
    "te_internet_default" BOOLEAN NOT NULL DEFAULT true,
    "retencio_policial_anys" INTEGER NOT NULL DEFAULT 3,
    "retencio_crm_anys" INTEGER,
    "ieet_import_persona_nit" DECIMAL(10,2),
    "verifactu_serie" TEXT NOT NULL DEFAULT 'FAC',
    "verifactu_test_mode" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuari" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CONSULTA',
    "actiu" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "usuari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "usuari_id" TEXT,
    "accio" "AccioAudit" NOT NULL,
    "entitat" TEXT NOT NULL,
    "entitat_id" TEXT,
    "detall" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "huesped" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "cognom1" TEXT NOT NULL,
    "cognom2" TEXT,
    "sexe" "Sexe",
    "data_naixement" TIMESTAMP(3),
    "nacionalitat" TEXT,
    "tipus_document" "TipusDocument",
    "num_document" TEXT,
    "num_suport" TEXT,
    "data_expedicio" TIMESTAMP(3),
    "data_caducitat" TIMESTAMP(3),
    "pais_emissor" TEXT,
    "email" TEXT,
    "telefon" TEXT,
    "adreca" TEXT,
    "pais" TEXT,
    "provincia" TEXT,
    "municipi" TEXT,
    "localitat" TEXT,
    "codi_postal" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "huesped_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_pujat" (
    "id" TEXT NOT NULL,
    "huesped_id" TEXT NOT NULL,
    "tipus" "TipusDocumentPujat" NOT NULL,
    "fitxer_nom" TEXT NOT NULL,
    "fitxer_path" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data_subida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuari_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "documento_pujat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estancia" (
    "id" TEXT NOT NULL,
    "establiment_id" TEXT NOT NULL,
    "tipus_registre" "TipusRegistre" NOT NULL,
    "num_contracte" TEXT NOT NULL,
    "any_contracte" INTEGER NOT NULL,
    "data_formalitzacio" TIMESTAMP(3) NOT NULL,
    "data_entrada" TIMESTAMP(3) NOT NULL,
    "data_sortida" TIMESTAMP(3) NOT NULL,
    "num_viatgers" INTEGER NOT NULL,
    "tipus_pagament" "TipusPagament" NOT NULL,
    "num_habitacions" INTEGER,
    "te_internet" BOOLEAN,
    "observacions" TEXT,
    "estat" "EstatEstancia" NOT NULL DEFAULT 'RESERVA',
    "habitacio_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "estancia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estancia_viatger" (
    "id" TEXT NOT NULL,
    "estancia_id" TEXT NOT NULL,
    "huesped_id" TEXT NOT NULL,
    "es_titular" BOOLEAN NOT NULL DEFAULT false,
    "parentesc" "Parentesc",
    "es_menor" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estancia_viatger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signatura" (
    "id" TEXT NOT NULL,
    "estancia_viatger_id" TEXT NOT NULL,
    "imatge" TEXT NOT NULL,
    "lloc_signatura" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "hora" TEXT NOT NULL,
    "usuari_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enviament_mossos" (
    "id" TEXT NOT NULL,
    "estancia_id" TEXT NOT NULL,
    "estat" "EstatEnviament" NOT NULL DEFAULT 'PENDENT',
    "fitxer_nom" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "data_enviament" TIMESTAMP(3),
    "justificant_path" TEXT,
    "codi_validacio" TEXT,
    "num_registre" TEXT,
    "resposta_raw" TEXT,
    "error_msg" TEXT,
    "usuari_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enviament_mossos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anotacio_huesped" (
    "id" TEXT NOT NULL,
    "huesped_id" TEXT NOT NULL,
    "estancia_id" TEXT,
    "sentit" "SentitAnotacio" NOT NULL,
    "tipus" TEXT,
    "descripcio" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuari_id" TEXT,
    "privada" BOOLEAN NOT NULL DEFAULT true,
    "no_acollir" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "anotacio_huesped_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habitacio" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "descripcio" TEXT,
    "capacitat" INTEGER,
    "estat" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "habitacio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasca_neteja" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "habitacio_id" TEXT NOT NULL,
    "tipus" "TipusNeteja" NOT NULL,
    "estat" "EstatTasca" NOT NULL DEFAULT 'PENDENT',
    "assignada_a" TEXT,
    "vinculada_sortida_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasca_neteja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animal" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "especie" TEXT NOT NULL,
    "data_naixement" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factura" (
    "id" TEXT NOT NULL,
    "estancia_id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "base" DECIMAL(10,2) NOT NULL,
    "iva" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "estat" "EstatFactura" NOT NULL DEFAULT 'PENDENT',
    "tipus_document" "TipusDocumentFiscal" NOT NULL DEFAULT 'RECIBO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linia_factura" (
    "id" TEXT NOT NULL,
    "factura_id" TEXT NOT NULL,
    "concepte" "ConcepteLinia" NOT NULL,
    "descripcio" TEXT NOT NULL,
    "import" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linia_factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasa_turistica" (
    "id" TEXT NOT NULL,
    "estancia_id" TEXT NOT NULL,
    "nits" INTEGER NOT NULL,
    "import_persona_nit" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasa_turistica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobrament" (
    "id" TEXT NOT NULL,
    "factura_id" TEXT NOT NULL,
    "metode" "MetodeCobrament" NOT NULL,
    "import" DECIMAL(10,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cobrament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registre_verifactu" (
    "id" TEXT NOT NULL,
    "factura_id" TEXT NOT NULL,
    "tipus_factura" "TipusFacturaVerifactu" NOT NULL,
    "serie" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "num_serie_factura" TEXT NOT NULL,
    "data_expedicio" TIMESTAMP(3) NOT NULL,
    "nif_emisor" TEXT NOT NULL,
    "nom_emisor" TEXT NOT NULL,
    "nif_destinatari" TEXT,
    "nom_destinatari" TEXT,
    "descripcio" TEXT NOT NULL,
    "base_imposable" DECIMAL(10,2) NOT NULL,
    "tipus_iva" DECIMAL(5,2) NOT NULL,
    "quota_iva" DECIMAL(10,2) NOT NULL,
    "import_no_subjecte" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "quota_total" DECIMAL(10,2) NOT NULL,
    "import_total" DECIMAL(10,2) NOT NULL,
    "huella" TEXT NOT NULL,
    "huella_anterior" TEXT NOT NULL,
    "fecha_hora_huso" TEXT NOT NULL,
    "qr_url" TEXT NOT NULL,
    "registre_json" JSONB NOT NULL,
    "software_json" JSONB NOT NULL,
    "estat" "EstatVerifactu" NOT NULL DEFAULT 'GENERAT',
    "data_enviament" TIMESTAMP(3),
    "csv" TEXT,
    "aeat_estat" TEXT,
    "aeat_error_codi" TEXT,
    "aeat_error_desc" TEXT,
    "resposta_raw" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registre_verifactu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria_gasto" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categoria_gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveidor" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "cif" TEXT,
    "contacte" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "proveidor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gasto" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "import" DECIMAL(10,2) NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "proveidor_id" TEXT,
    "habitacio_id" TEXT,
    "animal_id" TEXT,
    "descripcio" TEXT NOT NULL,
    "metode_pagament" "MetodeCobrament" NOT NULL,
    "adjunt_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actiu" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "data_compra" TIMESTAMP(3) NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "proveidor_id" TEXT,
    "habitacio_id" TEXT,
    "garantia_fins" TIMESTAMP(3),
    "ubicacio" TEXT,
    "num_serie" TEXT,
    "factura_path" TEXT,
    "estat" "EstatActiu" NOT NULL DEFAULT 'NOU',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "actiu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actiu_historial" (
    "id" TEXT NOT NULL,
    "actiu_id" TEXT NOT NULL,
    "tipus" "TipusHistorialActiu" NOT NULL,
    "descripcio" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "cost" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actiu_historial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treballador" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "telefon" TEXT,
    "email" TEXT,
    "data_contractacio" TIMESTAMP(3) NOT NULL,
    "carrec" TEXT NOT NULL,
    "salari" DECIMAL(10,2),
    "cost_empresa" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "treballador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absencia" (
    "id" TEXT NOT NULL,
    "treballador_id" TEXT NOT NULL,
    "tipus" "TipusAbsencia" NOT NULL,
    "data_inici" TIMESTAMP(3) NOT NULL,
    "data_fi" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nomina" (
    "id" TEXT NOT NULL,
    "treballador_id" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "base" DECIMAL(10,2) NOT NULL,
    "extres" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bonificacions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nomina_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuari_email_key" ON "usuari"("email");

-- CreateIndex
CREATE INDEX "audit_log_entitat_entitat_id_idx" ON "audit_log"("entitat", "entitat_id");

-- CreateIndex
CREATE INDEX "audit_log_usuari_id_idx" ON "audit_log"("usuari_id");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "huesped_cognom1_nom_idx" ON "huesped"("cognom1", "nom");

-- CreateIndex
CREATE UNIQUE INDEX "huesped_tipus_document_num_document_key" ON "huesped"("tipus_document", "num_document");

-- CreateIndex
CREATE INDEX "documento_pujat_huesped_id_idx" ON "documento_pujat"("huesped_id");

-- CreateIndex
CREATE INDEX "estancia_data_entrada_idx" ON "estancia"("data_entrada");

-- CreateIndex
CREATE INDEX "estancia_data_sortida_idx" ON "estancia"("data_sortida");

-- CreateIndex
CREATE INDEX "estancia_estat_idx" ON "estancia"("estat");

-- CreateIndex
CREATE UNIQUE INDEX "estancia_any_contracte_num_contracte_key" ON "estancia"("any_contracte", "num_contracte");

-- CreateIndex
CREATE INDEX "estancia_viatger_huesped_id_idx" ON "estancia_viatger"("huesped_id");

-- CreateIndex
CREATE UNIQUE INDEX "estancia_viatger_estancia_id_huesped_id_key" ON "estancia_viatger"("estancia_id", "huesped_id");

-- CreateIndex
CREATE UNIQUE INDEX "signatura_estancia_viatger_id_key" ON "signatura"("estancia_viatger_id");

-- CreateIndex
CREATE INDEX "enviament_mossos_estancia_id_idx" ON "enviament_mossos"("estancia_id");

-- CreateIndex
CREATE INDEX "enviament_mossos_estat_idx" ON "enviament_mossos"("estat");

-- CreateIndex
CREATE INDEX "anotacio_huesped_huesped_id_idx" ON "anotacio_huesped"("huesped_id");

-- CreateIndex
CREATE INDEX "tasca_neteja_data_idx" ON "tasca_neteja"("data");

-- CreateIndex
CREATE INDEX "tasca_neteja_habitacio_id_idx" ON "tasca_neteja"("habitacio_id");

-- CreateIndex
CREATE INDEX "tasca_neteja_estat_idx" ON "tasca_neteja"("estat");

-- CreateIndex
CREATE UNIQUE INDEX "factura_numero_key" ON "factura"("numero");

-- CreateIndex
CREATE INDEX "factura_estancia_id_idx" ON "factura"("estancia_id");

-- CreateIndex
CREATE INDEX "linia_factura_factura_id_idx" ON "linia_factura"("factura_id");

-- CreateIndex
CREATE INDEX "tasa_turistica_estancia_id_idx" ON "tasa_turistica"("estancia_id");

-- CreateIndex
CREATE INDEX "cobrament_factura_id_idx" ON "cobrament"("factura_id");

-- CreateIndex
CREATE UNIQUE INDEX "registre_verifactu_factura_id_key" ON "registre_verifactu"("factura_id");

-- CreateIndex
CREATE INDEX "registre_verifactu_created_at_idx" ON "registre_verifactu"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_gasto_nom_key" ON "categoria_gasto"("nom");

-- CreateIndex
CREATE INDEX "gasto_data_idx" ON "gasto"("data");

-- CreateIndex
CREATE INDEX "gasto_categoria_id_idx" ON "gasto"("categoria_id");

-- CreateIndex
CREATE INDEX "actiu_habitacio_id_idx" ON "actiu"("habitacio_id");

-- CreateIndex
CREATE INDEX "actiu_historial_actiu_id_idx" ON "actiu_historial"("actiu_id");

-- CreateIndex
CREATE INDEX "absencia_treballador_id_idx" ON "absencia"("treballador_id");

-- CreateIndex
CREATE INDEX "nomina_treballador_id_idx" ON "nomina"("treballador_id");

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_usuari_id_fkey" FOREIGN KEY ("usuari_id") REFERENCES "usuari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_pujat" ADD CONSTRAINT "documento_pujat_huesped_id_fkey" FOREIGN KEY ("huesped_id") REFERENCES "huesped"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_pujat" ADD CONSTRAINT "documento_pujat_usuari_id_fkey" FOREIGN KEY ("usuari_id") REFERENCES "usuari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estancia" ADD CONSTRAINT "estancia_establiment_id_fkey" FOREIGN KEY ("establiment_id") REFERENCES "establiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estancia" ADD CONSTRAINT "estancia_habitacio_id_fkey" FOREIGN KEY ("habitacio_id") REFERENCES "habitacio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estancia_viatger" ADD CONSTRAINT "estancia_viatger_estancia_id_fkey" FOREIGN KEY ("estancia_id") REFERENCES "estancia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estancia_viatger" ADD CONSTRAINT "estancia_viatger_huesped_id_fkey" FOREIGN KEY ("huesped_id") REFERENCES "huesped"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatura" ADD CONSTRAINT "signatura_estancia_viatger_id_fkey" FOREIGN KEY ("estancia_viatger_id") REFERENCES "estancia_viatger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatura" ADD CONSTRAINT "signatura_usuari_id_fkey" FOREIGN KEY ("usuari_id") REFERENCES "usuari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enviament_mossos" ADD CONSTRAINT "enviament_mossos_estancia_id_fkey" FOREIGN KEY ("estancia_id") REFERENCES "estancia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enviament_mossos" ADD CONSTRAINT "enviament_mossos_usuari_id_fkey" FOREIGN KEY ("usuari_id") REFERENCES "usuari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anotacio_huesped" ADD CONSTRAINT "anotacio_huesped_huesped_id_fkey" FOREIGN KEY ("huesped_id") REFERENCES "huesped"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anotacio_huesped" ADD CONSTRAINT "anotacio_huesped_estancia_id_fkey" FOREIGN KEY ("estancia_id") REFERENCES "estancia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anotacio_huesped" ADD CONSTRAINT "anotacio_huesped_usuari_id_fkey" FOREIGN KEY ("usuari_id") REFERENCES "usuari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasca_neteja" ADD CONSTRAINT "tasca_neteja_habitacio_id_fkey" FOREIGN KEY ("habitacio_id") REFERENCES "habitacio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasca_neteja" ADD CONSTRAINT "tasca_neteja_assignada_a_fkey" FOREIGN KEY ("assignada_a") REFERENCES "treballador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasca_neteja" ADD CONSTRAINT "tasca_neteja_vinculada_sortida_id_fkey" FOREIGN KEY ("vinculada_sortida_id") REFERENCES "estancia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factura" ADD CONSTRAINT "factura_estancia_id_fkey" FOREIGN KEY ("estancia_id") REFERENCES "estancia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linia_factura" ADD CONSTRAINT "linia_factura_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "factura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasa_turistica" ADD CONSTRAINT "tasa_turistica_estancia_id_fkey" FOREIGN KEY ("estancia_id") REFERENCES "estancia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrament" ADD CONSTRAINT "cobrament_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "factura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registre_verifactu" ADD CONSTRAINT "registre_verifactu_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "factura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto" ADD CONSTRAINT "gasto_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria_gasto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto" ADD CONSTRAINT "gasto_proveidor_id_fkey" FOREIGN KEY ("proveidor_id") REFERENCES "proveidor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto" ADD CONSTRAINT "gasto_habitacio_id_fkey" FOREIGN KEY ("habitacio_id") REFERENCES "habitacio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gasto" ADD CONSTRAINT "gasto_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actiu" ADD CONSTRAINT "actiu_proveidor_id_fkey" FOREIGN KEY ("proveidor_id") REFERENCES "proveidor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actiu" ADD CONSTRAINT "actiu_habitacio_id_fkey" FOREIGN KEY ("habitacio_id") REFERENCES "habitacio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actiu_historial" ADD CONSTRAINT "actiu_historial_actiu_id_fkey" FOREIGN KEY ("actiu_id") REFERENCES "actiu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absencia" ADD CONSTRAINT "absencia_treballador_id_fkey" FOREIGN KEY ("treballador_id") REFERENCES "treballador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nomina" ADD CONSTRAINT "nomina_treballador_id_fkey" FOREIGN KEY ("treballador_id") REFERENCES "treballador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

