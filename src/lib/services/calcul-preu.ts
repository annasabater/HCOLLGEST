/**
 * Calculadora de preus d'estada a partir del "full de preus" (TarifaTipus) +
 * disponibilitat d'habitacions per al taulell. Regles (acordades):
 * - L'estada es PARTEIX per temporada: cada tram de dates (p. ex. dies de maig i
 *   dies de juny) es cobra amb el preu de la seva temporada.
 * - Dins de cada tram, combinació per blocs grans primer: mes (30) → 2 setmanes
 *   (14) → setmana (7); els dies que sobren a `preuDia4` si en queden ≥4, si no `preuDia`.
 * - Temporada AUTOMÀTICA pel mes de cada nit (via `mesos`); es pot FORÇAR una
 *   sola temporada per a tota l'estada amb el desplegable.
 */
import 'server-only';
import { prisma } from '../db';
import { nights, toISODate } from '../dates';
import { GRUP_TARIFA, type GrupTarifa } from '../validation/tarifa-tipus';

const n = (d: unknown) => (d == null ? null : Number(d));
const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;
const addDies = (d: Date, dies: number) => { const x = new Date(d); x.setDate(x.getDate() + dies); return x; };
const MESOS_CA = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];

export interface LiniaCalcul {
  concepte: string;
  quantitat: number;
  preuUnitat: number;
  subtotal: number;
}

export interface SegmentCalcul {
  etiqueta: string;
  desde: string; // ISO (primera nit del tram)
  fins: string;  // ISO (sortida del tram)
  nits: number;
  linies: LiniaCalcul[];
  subtotal: number;
}

export interface ResultatCalcul {
  ok: boolean;
  error?: string;
  nits: number;
  grup: GrupTarifa;
  grupUsat: GrupTarifa;
  temporades: { id: string; etiqueta: string }[];
  temporadaForcada: string | null; // id de la temporada forçada, o null (automàtica)
  segments: SegmentCalcul[];
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
type Fila = { id: string; etiqueta: string; nota: string | null; mesos: number[] } & Preus;

function preusDe(f: { preuDia: unknown; preuDia4: unknown; preuSetmana: unknown; preuDosSetmanes: unknown; preuMes: unknown }): Preus {
  return {
    preuDia: n(f.preuDia), preuDia4: n(f.preuDia4), preuSetmana: n(f.preuSetmana),
    preuDosSetmanes: n(f.preuDosSetmanes), preuMes: n(f.preuMes),
  };
}
const esBuida = (p: Preus) => p.preuDia == null && p.preuDia4 == null && p.preuSetmana == null && p.preuDosSetmanes == null && p.preuMes == null;

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
    const diaFb = p.preuDia ?? p.preuDia4 ?? (p.preuSetmana ? p.preuSetmana / 7 : p.preuMes ? p.preuMes / 30 : 0);
    const dia4Fb = p.preuDia4 ?? p.preuDia ?? diaFb;
    const usaDia4 = rem >= 4 && (p.preuDia4 != null || p.preuDia == null);
    const preuUnitat = r2(usaDia4 ? dia4Fb : diaFb);
    linies.push({ concepte: rem >= 4 ? 'Dia (4+ dies)' : 'Dia', quantitat: rem, preuUnitat, subtotal: r2(rem * preuUnitat) });
    rem = 0;
  }
  return linies;
}

function tipusFisic(grup: GrupTarifa): { label: string; match: string } {
  return grup === 'INDIVIDUAL' ? { label: 'Individual', match: 'ndividual' } : { label: 'Doble', match: 'oble' };
}

export async function calcularPreu(opts: {
  grup: GrupTarifa;
  entrada: Date;
  sortida: Date;
  temporadaId?: string | null;
}): Promise<ResultatCalcul> {
  const buit = (error: string): ResultatCalcul => ({
    ok: false, error, nits: 0, grup: opts.grup, grupUsat: opts.grup,
    temporades: [], temporadaForcada: null, segments: [], total: 0, nota: null, disponibilitat: null,
  });

  if (!GRUP_TARIFA.includes(opts.grup)) return buit('Tipus d\'habitació no vàlid');
  const nits = nights(opts.entrada, opts.sortida);
  if (nits <= 0) return buit('La data de sortida ha de ser posterior a la d\'entrada');

  const totes = await prisma.tarifaTipus.findMany({ where: { actiu: true }, orderBy: [{ grup: 'asc' }, { ordre: 'asc' }] });
  const delGrup = totes.filter((t) => t.grup === opts.grup).map((t) => ({ id: t.id, etiqueta: t.etiqueta, nota: t.nota, mesos: t.mesos, ...preusDe(t) })) as Fila[];
  const doble = totes.filter((t) => t.grup === 'DOBLE').map((t) => ({ id: t.id, etiqueta: t.etiqueta, nota: t.nota, mesos: t.mesos, ...preusDe(t) })) as Fila[];
  const temporades = delGrup.map((t) => ({ id: t.id, etiqueta: t.etiqueta }));
  if (delGrup.length === 0) return buit('No hi ha tarifes per a aquest tipus d\'habitació');

  let grupUsat: GrupTarifa = opts.grup;
  const notes = new Set<string>();

  // Resol la temporada (i preus) per a un mes concret, amb prioritat a una fila
  // forçada. Doble 1 persona sense preus a l'estiu → tarifa d'Habitació Doble.
  function resoldre(mes: number, forcada?: Fila): { fila: Fila; preus: Preus } {
    let fila = forcada ?? delGrup.find((t) => t.mesos.includes(mes)) ?? delGrup[0]!;
    let preus = { preuDia: fila.preuDia, preuDia4: fila.preuDia4, preuSetmana: fila.preuSetmana, preuDosSetmanes: fila.preuDosSetmanes, preuMes: fila.preuMes };
    if (opts.grup === 'DOBLE_1P' && esBuida(preus) && doble.length > 0) {
      const fd = doble.find((t) => t.mesos.includes(mes)) ?? doble[0]!;
      fila = { ...fd, etiqueta: fd.etiqueta };
      preus = { preuDia: fd.preuDia, preuDia4: fd.preuDia4, preuSetmana: fd.preuSetmana, preuDosSetmanes: fd.preuDosSetmanes, preuMes: fd.preuMes };
      grupUsat = 'DOBLE';
      notes.add('Preu segons Habitació Doble.');
    }
    if (fila.nota) notes.add(fila.nota);
    return { fila, preus };
  }

  const forcada = opts.temporadaId ? delGrup.find((t) => t.id === opts.temporadaId) ?? undefined : undefined;

  // Construeix els trams. Amb temporada forçada → un sol tram per tota l'estada.
  // En automàtic → un tram per cada seqüència de nits de la mateixa temporada.
  const segments: SegmentCalcul[] = [];
  const filaDe = (i: number) => resoldre(addDies(opts.entrada, i).getMonth() + 1, forcada);
  let i = 0;
  while (i < nits) {
    const start = filaDe(i);
    let j = i + 1;
    while (j < nits && filaDe(j).fila.id === start.fila.id) j++;
    const segNits = j - i;
    const linies = desglossa(segNits, start.preus);
    segments.push({
      etiqueta: start.fila.etiqueta,
      desde: toISODate(addDies(opts.entrada, i)),
      fins: toISODate(addDies(opts.entrada, j)),
      nits: segNits,
      linies,
      subtotal: r2(linies.reduce((a, l) => a + l.subtotal, 0)),
    });
    i = j;
  }
  const total = r2(segments.reduce((a, s) => a + s.subtotal, 0));

  // Disponibilitat: habitacions del tipus físic lliures en el rang [entrada, sortida).
  const tf = tipusFisic(opts.grup);
  const habs = await prisma.habitacio.findMany({
    where: { deletedAt: null, tipus: { contains: tf.match, mode: 'insensitive' } },
    orderBy: { nom: 'asc' },
    select: { id: true, nom: true },
  });
  const ocupacions = await prisma.estancia.findMany({
    where: {
      deletedAt: null, estat: { not: 'CANCELLADA' },
      habitacioId: { in: habs.map((h) => h.id) },
      dataEntrada: { lt: opts.sortida }, dataSortida: { gt: opts.entrada },
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
    temporades,
    temporadaForcada: forcada?.id ?? null,
    segments,
    total,
    nota: notes.size ? [...notes].join(' ') : null,
    disponibilitat: {
      tipus: tf.label,
      lliures: habitacions.filter((h) => h.lliure).length,
      total: habitacions.length,
      habitacions,
    },
  };
}

export interface PeriodeProposat {
  etiqueta: string; // "Juliol 2026"
  dataInici: string; // ISO (primera nit del mes dins l'estada)
  dataFi: string; // ISO (última nit del mes dins l'estada)
  nits: number;
  import: number;
}

export interface PropostaPeriodes {
  ok: boolean;
  error?: string;
  entrada: string;
  sortida: string;
  nits: number;
  grup: GrupTarifa;
  calculadoraTotal: number; // preu que proposaria la calculadora
  importRepartit: number; // = l'import que ha posat l'usuari (suma dels períodes)
  coincideix: boolean; // si l'import ≈ el de la calculadora
  diferencia: number; // import − calculadoraTotal
  periodes: PeriodeProposat[];
}

/**
 * Proposa repartir un IMPORT (el que posa l'usuari de pagament/fiança) entre els
 * MESOS naturals de l'estada, segons el pes de cada mes a la calculadora de preus
 * (preu/nit efectiu × nits del mes). El total repartit sempre és l'import de
 * l'usuari; la calculadora només serveix per pesar i per avisar si no quadra.
 */
export async function proposaPeriodesPerMes(estanciaId: string, importe: number): Promise<PropostaPeriodes> {
  const fail = (error: string): PropostaPeriodes => ({
    ok: false, error, entrada: '', sortida: '', nits: 0, grup: 'DOBLE',
    calculadoraTotal: 0, importRepartit: 0, coincideix: false, diferencia: 0, periodes: [],
  });

  const est = await prisma.estancia.findFirst({
    where: { id: estanciaId, deletedAt: null },
    select: { dataEntrada: true, dataSortida: true, numViatgers: true, habitacio: { select: { tipus: true } } },
  });
  if (!est?.dataEntrada || !est?.dataSortida) return fail("L'estada no té dates d'entrada i sortida");
  const entrada = est.dataEntrada;
  const sortida = est.dataSortida;
  const nitsTotal = nights(entrada, sortida);
  if (nitsTotal <= 0) return fail('Dates no vàlides');

  // Tipus d'habitació → grup de tarifa.
  const tipus = est.habitacio?.tipus ?? '';
  const grup: GrupTarifa = /ndividual/i.test(tipus)
    ? 'INDIVIDUAL'
    : (est.numViatgers ?? 2) <= 1 ? 'DOBLE_1P' : 'DOBLE';

  const calc = await calcularPreu({ grup, entrada, sortida });
  const calculadoraTotal = calc.total;

  // Preu/nit efectiu de cada nit segons el segment (temporada/tram) que la cobreix.
  const perNightDe = (dataISO: string): number => {
    const seg = calc.segments.find((s) => dataISO >= s.desde && dataISO < s.fins);
    if (!seg || seg.nits <= 0) return 1;
    return seg.subtotal / seg.nits;
  };

  // Acumula per mes natural: pes (preu/nit × nits), nits, i primera/última nit.
  const mesos = new Map<string, { any: number; mes: number; pes: number; nits: number; primera: Date; ultima: Date }>();
  for (let i = 0; i < nitsTotal; i++) {
    const d = addDies(entrada, i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const pes = perNightDe(toISODate(d));
    const cur = mesos.get(key);
    if (cur) { cur.pes += pes; cur.nits += 1; cur.ultima = d; }
    else mesos.set(key, { any: d.getFullYear(), mes: d.getMonth(), pes, nits: 1, primera: d, ultima: d });
  }

  const ordenats = [...mesos.values()].sort((a, b) => (a.any - b.any) || (a.mes - b.mes));
  const pesTotal = ordenats.reduce((a, m) => a + m.pes, 0) || 1;

  // Reparteix EXACTAMENT `importe` segons el pes; l'últim mes absorbeix el residu
  // d'arrodoniment perquè la suma quadri al cèntim.
  const imp = r2(importe);
  let acumulat = 0;
  const periodes: PeriodeProposat[] = ordenats.map((m, idx) => {
    const isUltim = idx === ordenats.length - 1;
    const valor = isUltim ? r2(imp - acumulat) : r2((imp * m.pes) / pesTotal);
    acumulat = r2(acumulat + valor);
    return {
      etiqueta: `${MESOS_CA[m.mes]} ${m.any}`,
      dataInici: toISODate(m.primera),
      dataFi: toISODate(m.ultima),
      nits: m.nits,
      import: valor,
    };
  });

  return {
    ok: true,
    entrada: toISODate(entrada),
    sortida: toISODate(sortida),
    nits: nitsTotal,
    grup,
    calculadoraTotal,
    importRepartit: imp,
    coincideix: Math.abs(imp - calculadoraTotal) <= 0.5,
    diferencia: r2(imp - calculadoraTotal),
    periodes,
  };
}
