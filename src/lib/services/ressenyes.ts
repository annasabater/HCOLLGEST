/**
 * Ressenyes de Google moderades a /ressenyes i publicades a hostalcoll.com.
 * El text de la ressenya no es modifica mai: només es tria si surt, si es
 * destaca i en quin ordre (vegeu la nota de transparència a la web).
 */
import 'server-only';
import type { EstatRessenya } from '@prisma/client';
import { prisma } from '@/lib/db';
import { mouOrdre, ordenaPublicades, type Direccio } from '@/lib/ressenyes';

/** Canvia l'estat. En publicar, la ressenya va al final de la llista (no destacades). */
export async function canviaEstat(id: string, estat: EstatRessenya) {
  return prisma.$transaction(async (tx) => {
    const actual = await tx.ressenya.findUniqueOrThrow({ where: { id } });
    if (actual.estat === estat) return actual;
    let ordre = actual.ordre;
    if (estat === 'PUBLICADA') {
      const max = await tx.ressenya.aggregate({ where: { estat: 'PUBLICADA' }, _max: { ordre: true } });
      ordre = (max._max.ordre ?? -1) + 1;
    }
    return tx.ressenya.update({
      where: { id },
      data: {
        estat,
        ordre,
        publicadaAt: estat === 'PUBLICADA' ? new Date() : actual.publicadaAt,
        // Una ressenya que surt de la web deixa de ser destacada.
        destacada: estat === 'PUBLICADA' ? actual.destacada : false,
      },
    });
  });
}

/** Puja/baixa una publicada una posició. Retorna false si no es pot moure. */
export async function mouRessenya(id: string, dir: Direccio): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const publicades = await tx.ressenya.findMany({
      where: { estat: 'PUBLICADA' },
      select: { id: true, destacada: true, ordre: true, dataRessenya: true },
    });
    const nou = mouOrdre(publicades, id, dir);
    if (!nou) return false;
    for (const [rid, ordre] of nou) {
      await tx.ressenya.update({ where: { id: rid }, data: { ordre } });
    }
    return true;
  });
}

export interface RessenyaPublica {
  autor: string;
  puntuacio: number;
  text: string | null;
  idioma: string | null;
  data: string; // ISO yyyy-mm-dd
  resposta: string | null;
  destacada: boolean;
}

export interface RessenyesPubliques {
  google: { nota: number | null; total: number | null; url: string | null };
  ressenyes: RessenyaPublica[];
}

/** Dades per a hostalcoll.com: el resum REAL de Google + les publicades, en ordre. */
export async function ressenyesPubliques(): Promise<RessenyesPubliques> {
  const [est, publicades] = await Promise.all([
    prisma.establiment.findFirst({ select: { googleNota: true, googleTotal: true, googleUrl: true } }),
    prisma.ressenya.findMany({ where: { estat: 'PUBLICADA' } }),
  ]);
  return {
    google: {
      nota: est?.googleNota != null ? Number(est.googleNota) : null,
      total: est?.googleTotal ?? null,
      url: est?.googleUrl ?? null,
    },
    ressenyes: ordenaPublicades(publicades).map((r) => ({
      autor: r.autor,
      puntuacio: r.puntuacio,
      text: r.text,
      idioma: r.idioma,
      data: r.dataRessenya.toISOString().slice(0, 10),
      resposta: r.resposta,
      destacada: r.destacada,
    })),
  };
}
