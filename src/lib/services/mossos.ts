/**
 * Servicio Mossos: generación del fitxer massiu para una estancia y gestión
 * del ciclo de vida del enviament (PENDENT→ENVIAT→ACCEPTAT/REBUTJAT/ERROR).
 */
import 'server-only';
import { prisma } from '../db';
import { audit } from '../audit';
import { buildFileName, buildFitxerBuffer, isLayoutReady, type Encoding } from '../mossos/fitxer';
import { buildParteFromDb } from '../mossos/build-parte';

const ESTABLIMENT_ID = 'hostal-coll';

/** Error de configuración pendiente (§9): el flujo no puede continuar todavía. */
export class MossosConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MossosConfigError';
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
): Promise<GeneratedFitxer> {
  if (!isLayoutReady()) {
    throw new MossosConfigError(
      'No es pot generar el fitxer encara: falta l’ordre exacte de columnes del ' +
        '"Manual d’instruccions" de Mossos (§9.1). Omple FIELD_LAYOUT i CODES a ' +
        'src/lib/mossos/fitxer.ts. Mentrestant, fes el registre i comunica’l manualment.',
    );
  }

  const { establiment, estancia, viatgers } = await getEstanciaForParte(estanciaId);

  if (!establiment.fileIdentifier) {
    throw new MossosConfigError(
      'Falta el file_identifier de l’establiment (§9.2, 9-10 car. de "Dades de ' +
        'l’establiment" del portal). Configura’l a Configuració abans de generar el fitxer.',
    );
  }

  const parte = buildParteFromDb(establiment, estancia, viatgers);
  const encoding = (establiment.encoding as Encoding) || 'latin1';

  // Secuencia 001..999 basada en el nº de enviaments previos del establecimiento.
  const prev = await prisma.enviamentMossos.count();
  const seq = prev + 1;
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

  await audit({
    usuariId: actor?.id ?? null,
    accio: 'ENVIAMENT',
    entitat: 'enviament_mossos',
    entitatId: enviament.id,
    detall: { fitxerNom, estanciaId, accio: 'generacio_fitxer' },
    ip,
  });

  return { buffer, fitxerNom, enviamentId: enviament.id, encoding };
}
