/**
 * Taxa turística (IEET) per estades: llegeix les estades i els viatgers (amb les
 * dades congelades si n'hi ha, com el llibre de registre) i aplica les regles de
 * src/lib/ieet.ts. També la puja a Google Drive com a Excel de l'any.
 */
import 'server-only';
import { prisma } from '../db';
import { viatgerEfectiu } from '../registre-snapshot';
import { decryptString } from '../crypto';
import { getAccessToken, ensureFolder, ensureFolderPath, uploadOrUpdateFile, XLSX_MIME } from '../drive';
import { calculaIeet, resumIeet, type ConfigIeet, type EstadaIeet, type FilaIeet, type ResumIeet } from '../ieet';
import { buildIeetXlsx } from '../exports/ieet-xlsx';

const ESTABLIMENT_ID = 'hostal-coll';

export async function getConfigIeet(): Promise<ConfigIeet> {
  const e = await prisma.establiment.findFirst({ select: { ieetTarifa: true, ieetMaxNits: true, ieetEdatMinima: true } });
  return {
    tarifa: e ? Number(e.ieetTarifa) : 0.9,
    maxNits: e?.ieetMaxNits ?? 7,
    edatMinima: e?.ieetEdatMinima ?? 17,
  };
}

/** Totes les estades reals (en curs o acabades) amb els seus viatgers. */
async function carregaEstades(): Promise<EstadaIeet[]> {
  const es = await prisma.estancia.findMany({
    where: { deletedAt: null, estat: { in: ['EN_CURS', 'FINALITZADA'] }, dataEntrada: { not: null }, dataSortida: { not: null } },
    select: {
      id: true, numContracte: true, dataEntrada: true, dataSortida: true, estanciaOrigenId: true,
      habitacio: { select: { nom: true } },
      viatgers: {
        orderBy: { esTitular: 'desc' },
        select: { dadesCongelades: true, habitacioSeparada: { select: { nom: true } }, huesped: true },
      },
    },
  });
  return es.map((e) => ({
    id: e.id,
    numContracte: e.numContracte,
    dataEntrada: e.dataEntrada!,
    dataSortida: e.dataSortida!,
    estanciaOrigenId: e.estanciaOrigenId,
    habitacio: e.habitacio?.nom ?? null,
    viatgers: e.viatgers.map((v) => {
      const h = viatgerEfectiu(v.huesped, v.dadesCongelades);
      return {
        huespedId: v.huesped.id,
        habitacio: v.habitacioSeparada?.nom ?? null,
        nom: h.nom, cognom1: h.cognom1, cognom2: h.cognom2,
        tipusDocument: h.tipusDocument, numDocument: h.numDocument, nacionalitat: h.nacionalitat,
        dataNaixement: h.dataNaixement, adreca: h.adreca, codiPostal: h.codiPostal,
        municipi: h.municipi, localitat: h.localitat, pais: h.pais, telefon: h.telefon, email: h.email,
      };
    }),
  }));
}

export interface IeetAny { any: number; config: ConfigIeet; files: FilaIeet[]; resum: ResumIeet[] }

/** Persones que paguen (o surten a 0 €) amb entrada dins l'any indicat. */
export async function getIeetAny(any: number, avui = new Date()): Promise<IeetAny> {
  const [config, estades] = await Promise.all([getConfigIeet(), carregaEstades()]);
  const files = calculaIeet(estades, config, avui).filter((f) => f.trimestre.startsWith(`${any}-`));
  return { any, config, files, resum: resumIeet(files) };
}

/**
 * Reescriu l'Excel de l'any a Drive: «Hostal Coll — Gestió / <any> /
 * Taxa turística <any>.xlsx». Retorna el nom pujat, o null si Drive no està connectat.
 */
export async function pujaIeetDrive(any: number): Promise<string | null> {
  const est = await prisma.establiment.findFirst({ select: { driveRefreshTokenEnc: true, driveFolderId: true } });
  if (!est?.driveRefreshTokenEnc) return null;
  const token = await getAccessToken(decryptString(est.driveRefreshTokenEnc));
  let rootId = est.driveFolderId;
  if (!rootId) {
    rootId = await ensureFolder(token, 'Hostal Coll — Gestió');
    await prisma.establiment.update({ where: { id: ESTABLIMENT_ID }, data: { driveFolderId: rootId } });
  }
  const carpeta = await ensureFolderPath(token, [String(any)], rootId);
  const name = `Taxa turística ${any}.xlsx`;
  await uploadOrUpdateFile(token, { name, parentId: carpeta, mimeType: XLSX_MIME, data: await buildIeetXlsx(await getIeetAny(any)) });
  return name;
}
