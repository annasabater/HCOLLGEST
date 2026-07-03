/**
 * Servicio Mossos: generación del fitxer massiu para una estancia y gestión
 * del ciclo de vida del enviament (PENDENT→ENVIAT→ACCEPTAT/REBUTJAT/ERROR).
 */
import 'server-only';
import type { Huesped as DbHuesped } from '@prisma/client';
import { prisma } from '../db';
import { audit } from '../audit';
import { decryptString } from '../crypto';
import { saveUpload } from '../storage';
import {
  buildFileName,
  buildFitxerBuffer,
  isLayoutReady,
  isFormatConfirmat,
  validaParteErrors,
  type Encoding,
  type TipusPagament,
} from '../mossos/fitxer';
import { buildParteFromDb } from '../mossos/build-parte';
import { pujaFitxerAMossos, connectorAvailable } from '../mossos/connector';

const ESTABLIMENT_ID = 'hostal-coll';

/** Camps editables d'un viatger abans d'enviar a Mossos (dates en ISO 'yyyy-mm-dd'). */
export interface ViatgerOverride {
  nom?: string;
  cognom1?: string;
  cognom2?: string;
  tipusDocument?: string;
  numDocument?: string;
  numSuport?: string;
  dataExpedicio?: string;
  sexe?: string;
  dataNaixement?: string;
  nacionalitat?: string;
  telefon?: string;
  email?: string;
  adreca?: string;
  pais?: string;
  provincia?: string;
  municipi?: string;
  localitat?: string;
  codiPostal?: string;
}

const STR_FIELDS = [
  'nom', 'cognom1', 'cognom2', 'numDocument', 'numSuport', 'nacionalitat',
  'telefon', 'email', 'adreca', 'pais', 'provincia', 'municipi', 'localitat', 'codiPostal',
] as const;

/** Converteix un override en els canvis a aplicar a la fitxa (tipats per a Prisma). */
function overrideToChanges(ov: ViatgerOverride): Partial<DbHuesped> {
  const c: Partial<DbHuesped> = {};
  for (const f of STR_FIELDS) {
    const v = ov[f];
    if (v !== undefined) c[f] = (v.trim() || null) as never;
  }
  if (ov.tipusDocument !== undefined) c.tipusDocument = (ov.tipusDocument || null) as DbHuesped['tipusDocument'];
  if (ov.sexe !== undefined) c.sexe = (ov.sexe || null) as DbHuesped['sexe'];
  if (ov.dataExpedicio !== undefined) c.dataExpedicio = ov.dataExpedicio ? new Date(ov.dataExpedicio) : null;
  if (ov.dataNaixement !== undefined) c.dataNaixement = ov.dataNaixement ? new Date(ov.dataNaixement) : null;
  return c;
}

const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

/** Error de configuración pendiente (§9): el flujo no puede continuar todavía. */
export class MossosConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MossosConfigError';
  }
}

/** El registre està incomplet (§2.3): no es pot pujar a Mossos fins completar-lo. */
export class MossosIncompletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MossosIncompletError';
  }
}

export async function getEstanciaForParte(estanciaId: string) {
  const [establiment, estancia, viatgers] = await Promise.all([
    prisma.establiment.findUniqueOrThrow({ where: { id: ESTABLIMENT_ID } }),
    prisma.estancia.findUniqueOrThrow({ where: { id: estanciaId } }),
    prisma.estanciaViatger.findMany({
      where: { estanciaId },
      include: { huesped: true },
      orderBy: { esTitular: 'desc' },
    }),
  ]);
  return { establiment, estancia, viatgers };
}

export interface GeneratedFitxer {
  buffer: Buffer;
  fitxerNom: string;
  enviamentId: string;
  encoding: Encoding;
  /** true mentre el format no s'hagi confirmat amb el manual oficial (§9). */
  provisional: boolean;
}

/**
 * Genera el .txt del fitxer massiu para una estancia y registra un enviament
 * PENDENT. Lanza MossosConfigError si falta el layout del manual (§9.1) o el
 * file_identifier del establecimiento (§9.2).
 */
export async function generateFitxer(
  estanciaId: string,
  actor: { id: string } | null,
  ip: string | null,
  opts: {
    tipusPagamentMossos?: TipusPagament;
    /** Edicions per huespedId aplicades al fitxer. */
    overrides?: Record<string, ViatgerOverride>;
    /** Per huespedId: si true, l'edició també es desa a la fitxa de l'hoste. */
    persist?: Record<string, boolean>;
  } = {},
): Promise<GeneratedFitxer> {
  if (!isLayoutReady()) {
    throw new MossosConfigError(
      'No es pot generar el fitxer encara: falta l’ordre exacte de columnes del ' +
        '"Manual d’instruccions" de Mossos. Omple FIELD_LAYOUT i CODES a ' +
        'src/lib/mossos/fitxer.ts. Mentrestant, fes el registre i comunica’l manualment.',
    );
  }

  const { establiment, estancia, viatgers } = await getEstanciaForParte(estanciaId);

  if (!establiment.fileIdentifier) {
    throw new MossosConfigError(
      'Falta el file_identifier de l’establiment (9-10 car. de "Dades de ' +
        'l’establiment" del portal). Configura’l a Configuració abans de generar el fitxer.',
    );
  }

  // Edicions abans d'enviar: s'apliquen a la fitxa en memòria (perquè el fitxer
  // les reculli) i, si l'usuari ho ha demanat, també es desen a la base de dades.
  if (opts.overrides) {
    for (const row of viatgers) {
      const ov = opts.overrides[row.huespedId];
      if (!ov) continue;
      const changes = overrideToChanges(ov);
      if (Object.keys(changes).length === 0) continue;
      Object.assign(row.huesped, changes); // sempre, per al fitxer
      if (opts.persist?.[row.huespedId]) {
        await prisma.huesped.update({ where: { id: row.huespedId }, data: changes });
      }
    }
  }

  const parte = buildParteFromDb(establiment, estancia, viatgers);

  // Tipus de pagament a COMUNICAR a Mossos (per defecte "Pagament a destinació"),
  // independent del mètode de cobrament intern de l'estada.
  if (opts.tipusPagamentMossos) {
    parte.contracte.tipusPagament = opts.tipusPagamentMossos;
  }

  // §2.3: si falten dades obligatòries, NO es puja a Mossos. L'usuari ha de
  // completar el registre i tornar-ho a provar (avís clar, no error genèric).
  const faltes = validaParteErrors(parte);
  if (faltes.length) {
    throw new MossosIncompletError(
      'No s’ha pogut pujar a la web dels Mossos perquè el registre està incomplet. ' +
        'Edita’l, completa aquestes dades i torna-ho a provar:\n- ' +
        faltes.join('\n- '),
    );
  }

  const encoding = (establiment.encoding as Encoding) || 'latin1';

  // Seqüència 001..999: SEMPRE creixent (el més alt existent + 1), no pas el
  // recompte d'enviaments (que reutilitzava números en esborrar-ne un).
  const agg = await prisma.enviamentMossos.aggregate({ _max: { seq: true } });
  const seq = (agg._max.seq ?? 0) + 1;
  const fitxerNom = buildFileName(establiment.fileIdentifier, seq);

  const buffer = buildFitxerBuffer(parte, encoding); // valida internamente (§2.3)

  const enviament = await prisma.enviamentMossos.create({
    data: {
      estanciaId,
      estat: 'PENDENT',
      fitxerNom,
      seq: ((seq - 1) % 999) + 1,
      usuariId: actor?.id ?? null,
    },
  });

  // El registre era prou complet per generar el fitxer: ja no és un esborrany.
  if (estancia.esBorrany) {
    await prisma.estancia.update({ where: { id: estanciaId }, data: { esBorrany: false } });
  }

  await audit({
    usuariId: actor?.id ?? null,
    accio: 'ENVIAMENT',
    entitat: 'enviament_mossos',
    entitatId: enviament.id,
    detall: { fitxerNom, estanciaId, accio: 'generacio_fitxer' },
    ip,
  });

  return { buffer, fitxerNom, enviamentId: enviament.id, encoding, provisional: !isFormatConfirmat() };
}

export interface EnviamentAutomaticResult {
  ok: boolean;
  fitxerNom: string;
  codiValidacio?: string;
  errorMsg?: string;
}

type GenerateOpts = {
  tipusPagamentMossos?: TipusPagament;
  overrides?: Record<string, ViatgerOverride>;
  persist?: Record<string, boolean>;
};

/**
 * Genera el fitxer i el PUJA automàticament al portal de Mossos amb un navegador
 * remot (Browserbase), desa el comprovant i marca l'enviament. Llança
 * MossosConfigError si falta Browserbase o les credencials.
 */
export async function enviarFitxerMossos(
  estanciaId: string,
  actor: { id: string } | null,
  ip: string | null,
  opts: GenerateOpts = {},
): Promise<EnviamentAutomaticResult> {
  if (!connectorAvailable()) {
    throw new MossosConfigError(
      'La pujada automàtica no està configurada (falta Browserbase). Afegeix BROWSERBASE_API_KEY i ' +
        'BROWSERBASE_PROJECT_ID a les variables d’entorn.',
    );
  }
  const establiment = await prisma.establiment.findUniqueOrThrow({ where: { id: ESTABLIMENT_ID } });
  if (!establiment.mossosUser || !establiment.mossosPassEnc) {
    throw new MossosConfigError(
      'Falten les credencials de Mossos (usuari/contrasenya). Configura-les a Configuració abans de pujar automàticament.',
    );
  }

  // Genera el fitxer + crea l'enviament PENDENT (valida §2.3 i file_identifier).
  const gen = await generateFitxer(estanciaId, actor, ip, opts);

  const pass = decryptString(establiment.mossosPassEnc);
  const result = await pujaFitxerAMossos({
    fileBuffer: gen.buffer,
    fitxerNom: gen.fitxerNom,
    user: establiment.mossosUser,
    pass,
  });

  if (!result.ok) {
    await prisma.enviamentMossos.update({
      where: { id: gen.enviamentId },
      data: { estat: 'ERROR', errorMsg: result.errorMsg ?? 'Error desconegut' },
    });
    await audit({
      usuariId: actor?.id ?? null,
      accio: 'ENVIAMENT',
      entitat: 'enviament_mossos',
      entitatId: gen.enviamentId,
      detall: { accio: 'puja_auto', ok: false },
      ip,
    });
    return { ok: false, fitxerNom: gen.fitxerNom, errorMsg: result.errorMsg };
  }

  let justificantPath: string | null = null;
  if (result.comprovant) {
    try {
      justificantPath = await saveUpload(
        result.comprovant,
        result.comprovantNom ?? `comprovant-${gen.fitxerNom}.pdf`,
        'comprovants',
      );
    } catch {
      /* el comprovant no és el registre legal; si no es desa, l'enviament val igual */
    }
  }

  await prisma.enviamentMossos.update({
    where: { id: gen.enviamentId },
    data: {
      estat: 'ACCEPTAT',
      dataEnviament: new Date(),
      codiValidacio: result.codiValidacio ?? null,
      justificantPath,
    },
  });
  await audit({
    usuariId: actor?.id ?? null,
    accio: 'ENVIAMENT',
    entitat: 'enviament_mossos',
    entitatId: gen.enviamentId,
    detall: { accio: 'puja_auto', ok: true },
    ip,
  });

  return { ok: true, fitxerNom: gen.fitxerNom, codiValidacio: result.codiValidacio };
}

export interface FitxerPreviewViatger extends ViatgerOverride {
  huespedId: string;
  esTitular: boolean;
  esMenor: boolean;
  parentesc: string | null;
}

export interface FitxerPreview {
  establiment: { nom: string; fileIdentifier: string | null };
  contracte: {
    tipusRegistre: string;
    numContracte: string;
    anyContracte: number;
    dataFormalitzacio: string;
    dataEntrada: string;
    dataSortida: string;
  };
  viatgers: FitxerPreviewViatger[];
  esAmpliacio: boolean;
  /** Errors §2.3 que bloquejarien la generació (buit si tot correcte). */
  errors: string[];
}

/**
 * Retorna, en TEXT CLAR (descodificat, res xifrat), tot el que s'enviaria a Mossos
 * per a una estada, perquè l'usuari ho revisi i editi abans de generar el fitxer.
 */
export async function getFitxerPreview(estanciaId: string): Promise<FitxerPreview> {
  const { establiment, estancia, viatgers } = await getEstanciaForParte(estanciaId);
  const parte = buildParteFromDb(establiment, estancia, viatgers);
  const errors = validaParteErrors(parte);

  return {
    establiment: { nom: establiment.nom, fileIdentifier: establiment.fileIdentifier },
    contracte: {
      tipusRegistre: estancia.tipusRegistre,
      numContracte: estancia.numContracte,
      anyContracte: estancia.anyContracte,
      dataFormalitzacio: isoDate(estancia.dataFormalitzacio),
      dataEntrada: isoDate(estancia.dataEntrada),
      dataSortida: isoDate(estancia.dataSortida),
    },
    viatgers: viatgers.map((row) => {
      const h = row.huesped;
      return {
        huespedId: row.huespedId,
        esTitular: row.esTitular,
        esMenor: row.esMenor,
        parentesc: row.parentesc,
        nom: h.nom,
        cognom1: h.cognom1,
        cognom2: h.cognom2 ?? '',
        tipusDocument: h.tipusDocument ?? '',
        numDocument: h.numDocument ?? '',
        numSuport: h.numSuport ?? '',
        dataExpedicio: isoDate(h.dataExpedicio),
        sexe: h.sexe ?? '',
        dataNaixement: isoDate(h.dataNaixement),
        nacionalitat: h.nacionalitat ?? '',
        telefon: h.telefon ?? '',
        email: h.email ?? '',
        adreca: h.adreca ?? '',
        pais: h.pais ?? '',
        provincia: h.provincia ?? '',
        municipi: h.municipi ?? '',
        localitat: h.localitat ?? '',
        codiPostal: h.codiPostal ?? '',
      };
    }),
    esAmpliacio: estancia.estanciaOrigenId != null,
    errors,
  };
}
