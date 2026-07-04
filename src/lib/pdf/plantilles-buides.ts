/**
 * Plantilles EN BLANC (per imprimir i omplir a mà): la fitxa oficial de "Registre
 * de persones allotjades" (el formulari de Mossos sense dades) i el "Llibre de
 * registre" (el generador amb una estada buida). Les fa servir /justificants
 * (descàrrega i enviament per correu).
 */
import 'server-only';
import { prisma } from '../db';
import { buildRegistrePdf } from './registre';
import { FITXA_TEMPLATE_B64 } from './fitxa-template';

/** Fitxa "Registre de persones allotjades" en blanc = el formulari oficial buit. */
export function buildFitxaBlank(): Uint8Array {
  return new Uint8Array(Buffer.from(FITXA_TEMPLATE_B64, 'base64'));
}

/** Llibre de registre en blanc: capçalera de l'establiment + graella buida. */
export async function buildLlibreBlank(): Promise<Uint8Array> {
  const establiment = await prisma.establiment.findFirst();
  return buildRegistrePdf(establiment, {
    numContracte: '',
    anyContracte: new Date().getFullYear(),
    dataFormalitzacio: new Date(),
    dataEntrada: null,
    dataSortida: null,
    numHabitacions: null,
    teInternet: null,
    habitacio: null,
    viatgers: [],
    cobraments: [],
  });
}
