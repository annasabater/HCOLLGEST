import 'server-only';
import { prisma } from '../db';
import { buildParteFromDb } from '../mossos/build-parte';
import { validaParteFaltes } from '../mossos/fitxer';

export interface FitxaPendent {
  id: string;
  nom: string;
  contracte: string;
  total: number;  // nombre total de faltes
  resum: string;  // resum curt agrupat per viatger (nom un cop)
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
    let faltes = { generals: [] as string[], perViatger: [] as { viatger: string; faltes: string[] }[] };
    try { faltes = validaParteFaltes(buildParteFromDb(establiment, e, e.viatgers)); } catch { /* ignora */ }
    const total = faltes.generals.length + faltes.perViatger.reduce((a, g) => a + g.faltes.length, 0);
    if (total === 0) continue;
    const t = e.viatgers.find((v) => v.esTitular)?.huesped ?? e.viatgers[0]?.huesped ?? null;
    // Resum curt: nom (només primer nom) + les seves faltes, per cada viatger.
    const parts = [
      ...faltes.generals,
      ...faltes.perViatger.map((g) => `${g.viatger.split(' ')[0]}: ${g.faltes.join(', ')}`),
    ];
    out.push({
      id: e.id,
      nom: t ? `${t.nom} ${t.cognom1}` : '—',
      contracte: `${e.numContracte}/${e.anyContracte}`,
      total,
      resum: parts.join(' · '),
    });
    if (out.length >= limit) break;
  }
  return out;
}
