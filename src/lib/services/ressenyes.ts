/**
 * Ressenyes de Google moderades a /ressenyes i publicades a hostalcoll.com.
 * El text de la ressenya no es modifica mai: només es tria si surt i si es
 * destaca. L'ordre a la web és per data (la més nova primer), amb les
 * destacades davant (vegeu la nota de transparència a la web).
 */
import 'server-only';
import type { EstatRessenya } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ordenaPublicades, parseTraduccions, type Traduccions } from '@/lib/ressenyes';

/** Canvia l'estat (publicar / amagar / tornar a pendent). */
export async function canviaEstat(id: string, estat: EstatRessenya) {
  const actual = await prisma.ressenya.findUniqueOrThrow({ where: { id } });
  if (actual.estat === estat) return actual;
  return prisma.ressenya.update({
    where: { id },
    data: {
      estat,
      publicadaAt: estat === 'PUBLICADA' ? new Date() : actual.publicadaAt,
      // Una ressenya que surt de la web deixa de ser destacada.
      destacada: estat === 'PUBLICADA' ? actual.destacada : false,
    },
  });
}

export interface RessenyaPublica {
  autor: string;
  puntuacio: number;
  text: string | null;
  idioma: string | null;
  data: string; // ISO yyyy-mm-dd
  dataPrecisio: string; // DIA | MES | ANY (la web no mostra dia/mes si no se saben)
  resposta: string | null;
  destacada: boolean;
  /** Text per idioma de la web; null si encara no s'ha traduït (la web mostra l'original). */
  traduccions: Traduccions | null;
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
      dataPrecisio: r.dataPrecisio,
      resposta: r.resposta,
      destacada: r.destacada,
      traduccions: parseTraduccions(r.traduccions),
    })),
  };
}
