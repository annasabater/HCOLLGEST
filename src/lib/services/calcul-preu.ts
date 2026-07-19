/**
 * Calculadora de preus d'estada a partir del "full de preus" (TarifaTipus) +
 * disponibilitat d'habitacions per al taulell. Regles (acordades):
 * - Combinació MÉS BARATA per blocs grans primer: mes (30) → 2 setmanes (14) →
 *   setmana (7); els dies que sobren a `preuDia4` si en queden ≥4, si no `preuDia`.
 * - Temporada AUTOMÀTICA pel mes d'entrada (via `mesos`), amb opció de forçar-la.
 */
import 'server-only';
import { prisma } from '../db';
import { nights } from '../dates';
import { GRUP_TARIFA, type GrupTarifa } from '../validation/tarifa-tipus';

const n = (d: unknown) => (d == null ? null : Number(d));
const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

export interface LiniaCalcul {
  concepte: string;
  quantitat: number;
  preuUnitat: number;
  subtotal: number;
}

export interface ResultatCalcul {
  ok: boolean;
  error?: string;
  nits: number;
  grup: GrupTarifa;
  grupUsat: GrupTarifa;
  temporada: { id: string; etiqueta: string } | null;
  temporades: { id: string; etiqueta: string }[];
  linies: LiniaCalcul[];
  total: number;
  nota: string | null;
  disponibilitat: {
    tipus: string;
    lliures: number;
    total: number;
    habitacions: { nom: string; lliure: boolean; ocupadaPer: string | null }[];
  } | null;
}

interface Preus {
  preuDia: number | null; preuDia4: number | null;
  preuSetmana: number | null; preuDosSetmanes: number | null; preuMes: number | null;
}

/** Desglossa `nits` en blocs (mes/2setm/setmana) i dies, amb el preu de cada tram. */
function desglossa(nits: number, p: Preus): LiniaCalcul[] {
  const linies: LiniaCalcul[] = [];
  let rem = nits;
  const bloc = (preu: number | null, dies: number, nom: string) => {
    if (!preu || rem < dies) return;
    const q = Math.floor(rem / dies);
    if (q <= 0) return;
    linies.push({ concepte: nom, quantitat: q, preuUnitat: preu, subtotal: r2(q * preu) });
    rem -= q * dies;
  };
  bloc(p.preuMes, 30, 'Mes');
  bloc(p.preuDosSetmanes, 14, '2 setmanes');
  bloc(p.preuSetmana, 7, 'Setmana');
  if (rem > 0) {
    // Preu per dia: a partir de 4 dies s'aplica preuDia4; si no, preuDia. Amb
    // fallbacks perquè mai quedi a 0 si falta algun preu.
    const diaFb = p.preuDia ?? p.preuDia4 ?? (p.preuSetmana ? p.preuSetmana / 7 : p.preuMes ? p.preuMes / 30 : 0);
    const dia4Fb = p.preuDia4 ?? p.preuDia ?? diaFb;
    const usaDia4 = rem >= 4 && (p.preuDia4 != null || p.preuDia == null);
    const preuUnitat = r2(usaDia4 ? dia4Fb : diaFb);
    linies.push({
      concepte: rem >= 4 ? 'Dia (4+ dies)' : 'Dia',
      quantitat: rem,
      preuUnitat,
      subtotal: r2(rem * preuUnitat),
    });
    rem = 0;
  }
  return linies;
}

function tipusFisic(grup: GrupTarifa): { label: string; match: string } {
  return grup === 'INDIVIDUAL'
    ? { label: 'Individual', match: 'ndividual' }
    : { label: 'Doble', match: 'oble' };
}

export async function calcularPreu(opts: {
  grup: GrupTarifa;
  entrada: Date;
  sortida: Date;
  temporadaId?: string | null;
}): Promise<ResultatCalcul> {
  const buit = (error: string): ResultatCalcul => ({
    ok: false, error, nits: 0, grup: opts.grup, grupUsat: opts.grup,
    temporada: null, temporades: [], linies: [], total: 0, nota: null, disponibilitat: null,
  });

  if (!GRUP_TARIFA.includes(opts.grup)) return buit('Tipus d\'habitació no vàlid');
  const nits = nights(opts.entrada, opts.sortida);
  if (nits <= 0) return buit('La data de sortida ha de ser posterior a la d\'entrada');

  const totes = await prisma.tarifaTipus.findMany({ where: { actiu: true }, orderBy: [{ grup: 'asc' }, { ordre: 'asc' }] });
  const delGrup = totes.filter((t) => t.grup === opts.grup);
  const temporades = delGrup.map((t) => ({ id: t.id, etiqueta: t.etiqueta }));

  // Tria de temporada: forçada, o automàtica pel mes d'entrada, o la primera.
  const mesEntrada = opts.entrada.getMonth() + 1;
  let fila =
    (opts.temporadaId && delGrup.find((t) => t.id === opts.temporadaId)) ||
    delGrup.find((t) => t.mesos.includes(mesEntrada)) ||
    delGrup[0] ||
    null;
  if (!fila) return buit('No hi ha tarifes per a aquest tipus d\'habitació');

  let grupUsat: GrupTarifa = opts.grup;
  let nota: string | null = fila.nota ?? null;

  // Doble 1 persona a l'estiu: preus segons Habitació Doble. Si la fila triada no té
  // cap preu, es fa servir la temporada equivalent de DOBLE.
  const buida = (t: typeof fila) =>
    !t || (t.preuDia == null && t.preuDia4 == null && t.preuSetmana == null && t.preuDosSetmanes == null && t.preuMes == null);
  if (opts.grup === 'DOBLE_1P' && buida(fila)) {
    const doble = totes.filter((t) => t.grup === 'DOBLE');
    const filaDoble = doble.find((t) => t.mesos.includes(mesEntrada)) || doble[0] || null;
    if (filaDoble) {
      fila = filaDoble;
      grupUsat = 'DOBLE';
      nota = 'Preu segons Habitació Doble.';
    }
  }

  const preus: Preus = {
    preuDia: n(fila.preuDia), preuDia4: n(fila.preuDia4), preuSetmana: n(fila.preuSetmana),
    preuDosSetmanes: n(fila.preuDosSetmanes), preuMes: n(fila.preuMes),
  };
  const linies = desglossa(nits, preus);
  const total = r2(linies.reduce((a, l) => a + l.subtotal, 0));

  // Disponibilitat: habitacions del tipus físic lliures en el rang [entrada, sortida).
  const tf = tipusFisic(opts.grup);
  const habs = await prisma.habitacio.findMany({
    where: { deletedAt: null, tipus: { contains: tf.match, mode: 'insensitive' } },
    orderBy: { nom: 'asc' },
    select: { id: true, nom: true },
  });
  const ocupacions = await prisma.estancia.findMany({
    where: {
      deletedAt: null,
      estat: { not: 'CANCELLADA' },
      habitacioId: { in: habs.map((h) => h.id) },
      dataEntrada: { lt: opts.sortida },
      dataSortida: { gt: opts.entrada },
    },
    select: { habitacioId: true, viatgers: { where: { esTitular: true }, take: 1, select: { huesped: { select: { nom: true, cognom1: true } } } } },
  });
  const ocupadaPer = new Map<string, string>();
  for (const o of ocupacions) {
    if (!o.habitacioId) continue;
    const h = o.viatgers[0]?.huesped;
    ocupadaPer.set(o.habitacioId, h ? `${h.nom} ${h.cognom1}` : 'Ocupada');
  }
  const habitacions = habs.map((h) => ({ nom: h.nom, lliure: !ocupadaPer.has(h.id), ocupadaPer: ocupadaPer.get(h.id) ?? null }));

  return {
    ok: true,
    nits,
    grup: opts.grup,
    grupUsat,
    temporada: { id: fila.id, etiqueta: fila.etiqueta },
    temporades,
    linies,
    total,
    nota,
    disponibilitat: {
      tipus: tf.label,
      lliures: habitacions.filter((h) => h.lliure).length,
      total: habitacions.length,
      habitacions,
    },
  };
}
