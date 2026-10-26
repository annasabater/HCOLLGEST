import 'server-only';
import { prisma } from '../db';
import { nights, toISODate } from '../dates';
import { whereTocaHabitacio, tramsSolapats, SELECT_CANVIS } from '../habitacio-trams';
import { isoMesDies } from '../pressupost-calcul';
import { proposaHabitacions, type Proposta } from '../propostes-habitacio';
import { NITS_MES, nitsPerBloc, type BlocReglaDe3 } from '../preu-estada';
import type { GrupTarifa } from '../validation/tarifa-tipus';
import { calcularPreu, carregaTarifes } from './calcul-preu';

export interface TrosOcupacio {
  desde: string; // ISO
  fins: string; // ISO (dins l'estada)
  lliure: boolean;
  qui: string | null;
  finsOcupacio: string | null; // ISO: fins quan hi és l'hoste (pot passar de la sortida)
}

export interface HabitacioDies {
  nom: string;
  tipus: 'Doble' | 'Individual';
  trossos: TrosOcupacio[];
}

/**
 * Disponibilitat dia a dia de les habitacions per a una estada i propostes de
 * com allotjar-la (amb un canvi d'habitació com a molt). Per a 1 persona
 * («Doble (1 persona)» o «Individual») entren dobles i individuals; per a 2,
 * només dobles, i només es proposa canviar si cap doble és lliure tota l'estada.
 */
export async function disponibilitatIPropostes(opts: {
  grup: GrupTarifa;
  entrada: Date;
  sortida: Date;
  mensual?: boolean;
  bloc?: BlocReglaDe3;
}): Promise<{ habitacions: HabitacioDies[]; propostes: Proposta[] }> {
  const nits = nights(opts.entrada, opts.sortida);
  if (nits <= 0) return { habitacions: [], propostes: [] };
  const unaPersona = opts.grup !== 'DOBLE';

  const totes = await prisma.habitacio.findMany({
    where: { deletedAt: null },
    orderBy: { nom: 'asc' },
    select: { id: true, nom: true, tipus: true },
  });
  const habs = totes
    .map((h) => ({ ...h, tipus: /ndividual/i.test(h.tipus ?? '') ? 'Individual' as const : /oble/i.test(h.tipus ?? '') ? 'Doble' as const : null }))
    .filter((h): h is typeof h & { tipus: 'Doble' | 'Individual' } => h.tipus === 'Doble' || (unaPersona && h.tipus === 'Individual'))
    .sort((a, b) => (a.tipus === b.tipus ? a.nom.localeCompare(b.nom, 'ca', { numeric: true }) : a.tipus === 'Doble' ? -1 : 1));

  const ocupacions = await prisma.estancia.findMany({
    where: {
      deletedAt: null, estat: { not: 'CANCELLADA' },
      ...whereTocaHabitacio(habs.map((h) => h.id)),
      dataEntrada: { lt: opts.sortida }, dataSortida: { gt: opts.entrada },
    },
    select: { habitacioId: true, dataEntrada: true, dataSortida: true, ...SELECT_CANVIS, viatgers: { where: { esTitular: true }, take: 1, select: { huesped: { select: { nom: true, cognom1: true } } } } },
  });

  // Per nit i habitació: qui hi és i fins quan.
  const idx = (d: Date) => Math.round((d.getTime() - opts.entrada.getTime()) / 86_400_000);
  const nitA = new Map<string, ({ qui: string; fins: string } | null)[]>(habs.map((h) => [h.id, Array(nits).fill(null)]));
  for (const o of ocupacions) {
    const h = o.viatgers[0]?.huesped;
    const qui = h ? `${h.nom} ${h.cognom1}` : 'Ocupada';
    for (const t of tramsSolapats(o, opts.entrada, opts.sortida)) {
      const fila = t.habitacioId ? nitA.get(t.habitacioId) : null;
      if (!fila || !t.desde || !t.fins) continue;
      for (let k = Math.max(0, idx(t.desde)); k < Math.min(nits, idx(t.fins)); k++) fila[k] = { qui, fins: toISODate(t.fins) };
    }
  }

  const entradaIso = toISODate(opts.entrada);
  const habitacions: HabitacioDies[] = habs.map((h) => {
    const fila = nitA.get(h.id)!;
    const trossos: TrosOcupacio[] = [];
    let i = 0;
    while (i < nits) {
      const c = fila[i];
      let j = i + 1;
      while (j < nits && (fila[j]?.qui ?? null) === (c?.qui ?? null) && (fila[j]?.fins ?? null) === (c?.fins ?? null)) j++;
      trossos.push({ desde: isoMesDies(entradaIso, i), fins: isoMesDies(entradaIso, j), lliure: !c, qui: c?.qui ?? null, finsOcupacio: c?.fins ?? null });
      i = j;
    }
    return { nom: h.nom, tipus: h.tipus, trossos };
  });

  // Preu de cada tros amb la tarifa de la seva habitació, com a part de l'estada sencera.
  const tarifes = await carregaTarifes();
  // Un mes de calendari sencer (febrer) compta com a mes encara que no arribi a 30 nits.
  const nitsEstada = nitsPerBloc(entradaIso, toISODate(opts.sortida));
  const mensual = opts.mensual ?? nitsEstada >= NITS_MES;
  const cache = new Map<string, number>();
  const preu = async (grup: string, i: number, j: number) => {
    const key = `${grup}|${i}|${j}`;
    if (!cache.has(key)) {
      const r = await calcularPreu({
        grup: grup as GrupTarifa,
        entrada: new Date(`${isoMesDies(entradaIso, i)}T00:00:00Z`),
        sortida: new Date(`${isoMesDies(entradaIso, j)}T00:00:00Z`),
        mensual, nitsEstada, bloc: opts.bloc, tarifes, senseDisponibilitat: true,
      });
      cache.set(key, r.total);
    }
    return cache.get(key)!;
  };

  const grupDe = (tipus: 'Doble' | 'Individual'): GrupTarifa => (tipus === 'Individual' ? 'INDIVIDUAL' : unaPersona ? 'DOBLE_1P' : 'DOBLE');
  let propostes = await proposaHabitacions(
    entradaIso,
    nits,
    habs.map((h) => ({ nom: h.nom, grup: grupDe(h.tipus), ocupades: new Set(nitA.get(h.id)!.flatMap((c, k) => (c ? [k] : []))) })),
    preu,
  );
  // 2 persones: només cal proposar si cap doble és lliure tota l'estada.
  if (!unaPersona && habitacions.some((h) => h.trossos.length === 1 && h.trossos[0]!.lliure)) propostes = [];

  return { habitacions, propostes };
}
