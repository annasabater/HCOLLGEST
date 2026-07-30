import 'server-only';
import { prisma } from '../db';
import { buildParteFromDb } from '../mossos/build-parte';
import { validaParteErrors } from '../mossos/fitxer';

export interface FitxaPendent {
  id: string;
  nom: string;
  contracte: string;
  faltes: string[];
}

/**
 * Estades amb dades OBLIGATÒRIES pendents (camps *), no silenciades ni
 * cancel·lades. Serveix per avisar al taulell i a /justificants amb el detall
 * del que falta (mateixa validació que el fitxer de Mossos).
 */
export async function fitxesDadesPendents(limit = 50): Promise<FitxaPendent[]> {
  const establiment = await prisma.establiment.findFirst();
  if (!establiment) return [];

  const estancies = await prisma.estancia.findMany({
    where: { deletedAt: null, avisDadesParat: false, estat: { not: 'CANCELLADA' } },
    orderBy: { dataFormalitzacio: 'desc' },
    take: 300,
    include: {
      viatgers: {
        include: { huesped: true, habitacioSeparada: { select: { nom: true } } },
        orderBy: { esTitular: 'desc' },
      },
    },
  });

  const out: FitxaPendent[] = [];
  for (const e of estancies) {
    let faltes: string[] = [];
    try { faltes = validaParteErrors(buildParteFromDb(establiment, e, e.viatgers)); } catch { faltes = []; }
    if (faltes.length === 0) continue;
    const t = e.viatgers.find((v) => v.esTitular)?.huesped ?? e.viatgers[0]?.huesped ?? null;
    out.push({
      id: e.id,
      nom: t ? `${t.nom} ${t.cognom1}` : '—',
      contracte: `${e.numContracte}/${e.anyContracte}`,
      faltes,
    });
    if (out.length >= limit) break;
  }
  return out;
}
