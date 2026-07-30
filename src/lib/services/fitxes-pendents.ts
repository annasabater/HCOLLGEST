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
    // Resum MOLT breu per a la targeta: només el nom del camp que falta (sense
    // "falta el", sense parèntesis ni valors), p. ex. "número de suport, parentesc".
    const terse = (s: string) =>
      s
        .replace(/^falta (el |la |l’|l'|els |les )?/i, '')
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/«[^»]*»\s*/g, '')
        .replace(/codi ISO/gi, 'ISO')
        .replace(/codi INE/gi, 'INE')
        .replace(/\s+/g, ' ')
        .trim();
    const viatgersTerse = faltes.perViatger.map((g) => ({ nom: g.viatger.split(' ')[0], camps: g.faltes.map(terse) }));
    // Un sol viatger i sense errors generals → no cal repetir el nom.
    const resum =
      faltes.generals.length === 0 && viatgersTerse.length === 1
        ? viatgersTerse[0]!.camps.join(', ')
        : [...faltes.generals.map(terse), ...viatgersTerse.map((g) => `${g.nom}: ${g.camps.join(', ')}`)].join(' · ');
    out.push({
      id: e.id,
      nom: t ? `${t.nom} ${t.cognom1}` : '—',
      contracte: `${e.numContracte}/${e.anyContracte}`,
      total,
      resum,
    });
    if (out.length >= limit) break;
  }
  return out;
}
