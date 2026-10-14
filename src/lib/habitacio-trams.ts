/**
 * Trams d'habitació d'una estada (pur i testejat).
 *
 * Una estada pot canviar d'habitació a mitja estada sense canviar de contracte
 * (model `CanviHabitacio`). Cada canvi tanca el tram anterior el dia del canvi
 * (aquell dia ja dorm a la nova, com una rotació sortida/entrada) i
 * l'habitació de l'últim tram és `Estancia.habitacioId`. Així l'ocupació
 * d'una habitació només compta els dies que l'hoste hi era de veritat.
 */
import type { Prisma } from '@prisma/client';

export interface CanviTram {
  data: Date;
  habitacioAnteriorId: string | null;
}

export interface EstadaAmbCanvis {
  habitacioId: string | null;
  dataEntrada: Date | null;
  dataSortida: Date | null;
  canvisHabitacio?: CanviTram[];
}

export interface TramHabitacio {
  habitacioId: string | null;
  desde: Date | null;
  fins: Date | null;
}

export function tramsHabitacio(e: EstadaAmbCanvis): TramHabitacio[] {
  const canvis = [...(e.canvisHabitacio ?? [])].sort((a, b) => a.data.getTime() - b.data.getTime());
  const trams: TramHabitacio[] = [];
  let desde = e.dataEntrada;
  for (const c of canvis) {
    trams.push({ habitacioId: c.habitacioAnteriorId, desde, fins: c.data });
    desde = c.data;
  }
  trams.push({ habitacioId: e.habitacioId, desde, fins: e.dataSortida });
  // Un tram sense nits (canvi el mateix dia d'entrada o dos canvis el mateix dia) no ocupa res.
  const ambNits = trams.filter((t) => !t.desde || !t.fins || t.fins.getTime() > t.desde.getTime());
  return ambNits.length ? ambNits : trams.slice(-1);
}

/**
 * Trams de l'estada que se solapen amb [desde, fins]. `inclusiu` = també compten
 * els que només toquen un extrem (calendari); per defecte el dia de sortida d'un
 * i entrada de l'altre NO és solapament (rotació).
 */
export function tramsSolapats(
  e: EstadaAmbCanvis,
  desde: Date,
  fins: Date,
  opts: { habitacioId?: string | string[]; inclusiu?: boolean } = {},
): TramHabitacio[] {
  const ids = opts.habitacioId === undefined ? null : new Set([opts.habitacioId].flat());
  return tramsHabitacio(e).filter((t) => {
    if (!t.habitacioId || (ids && !ids.has(t.habitacioId))) return false;
    if (!t.desde || !t.fins) return false;
    return opts.inclusiu
      ? t.desde.getTime() <= fins.getTime() && t.fins.getTime() >= desde.getTime()
      : t.desde.getTime() < fins.getTime() && t.fins.getTime() > desde.getTime();
  });
}

/** Habitació on dormia l'hoste la nit que comença el dia `d`. */
export function habitacioEnData(e: EstadaAmbCanvis, d: Date): string | null {
  const trams = tramsHabitacio(e);
  for (const t of trams) {
    if ((!t.desde || t.desde.getTime() <= d.getTime()) && (!t.fins || d.getTime() < t.fins.getTime())) {
      return t.habitacioId;
    }
  }
  return trams[trams.length - 1]?.habitacioId ?? null;
}

/** Filtre Prisma: estades que han tocat alguna d'aquestes habitacions (algun tram). */
export function whereTocaHabitacio(id: string | string[]): Prisma.EstanciaWhereInput {
  const f = Array.isArray(id) ? { in: id } : id;
  return { OR: [{ habitacioId: f }, { canvisHabitacio: { some: { habitacioAnteriorId: f } } }] };
}

/** Filtre Prisma: estades amb alguna habitació en algun tram. */
export const WHERE_AMB_HABITACIO: Prisma.EstanciaWhereInput = {
  OR: [{ habitacioId: { not: null } }, { canvisHabitacio: { some: { habitacioAnteriorId: { not: null } } } }],
};

/** `select` dels canvis necessaris per calcular els trams. */
export const SELECT_CANVIS = {
  canvisHabitacio: { select: { data: true, habitacioAnteriorId: true }, orderBy: { data: 'asc' } },
} as const satisfies Prisma.EstanciaSelect;
