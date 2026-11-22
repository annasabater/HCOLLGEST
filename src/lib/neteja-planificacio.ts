/**
 * Planificació de la neteja (pur, testejat): el full «per setmanes» com el que es
 * feia a mà. Cada setmana (dilluns–diumenge) té els dies que ve la persona de la
 * neteja; cada dia, les habitacions amb sortida o manteniment i les observacions.
 *
 * Un dia pot tenir habitacions FETES (TascaNeteja, desades al «Full del dia») i
 * PLANIFICADES (NetejaPlanificada, encara no fetes). Si una habitació té les dues
 * coses el mateix dia, mana la feta.
 */
import { rangPeriode, type EstatPeriode } from './periode';
import { sumaDiesDia } from './prorroga';

export type TipusNeteja = 'CANVI_COMPLET' | 'REPAS';

export interface PlaInput {
  id: string;
  data: string; // YYYY-MM-DD
  habitacioId: string;
  habitacio: string;
  tipus: TipusNeteja;
  treballadorId: string | null;
  nota: string | null;
}
export interface TascaInput {
  id: string;
  data: string;
  habitacioId: string | null; // null = zones comunes
  habitacio: string | null;
  tipus: TipusNeteja;
  estat: 'PENDENT' | 'FETA';
  treballadorId: string | null;
  notes: string | null;
  bugaderia: boolean;
}
export interface NotaInput {
  id: string;
  data: string; // per a SETMANA, el dilluns
  ambit: 'DIA' | 'SETMANA';
  text: string;
}
export interface JornadaInput {
  data: string;
  pagada: boolean;
}

export interface HabDia {
  /** id de la planificació o de la tasca. */
  id: string;
  origen: 'PLA' | 'FETA';
  habitacioId: string | null;
  nom: string;
  tipus: TipusNeteja;
  nota: string | null;
  bugaderia: boolean;
}
export interface DiaNeteja {
  data: string;
  treballadorId: string | null;
  habitacions: HabDia[];
  nota: NotaInput | null;
  /** Hi ha alguna habitació desada al full del dia (feta). */
  fet: boolean;
  /** Pagament registrat del dia: PAGAT, PER_PAGAR (registrat i no pagat) o null. */
  pagament: 'PAGAT' | 'PER_PAGAR' | null;
}
export interface SetmanaNeteja {
  dilluns: string;
  diumenge: string;
  nota: NotaInput | null;
  dies: DiaNeteja[];
}

/** Dilluns de la setmana d'un dia (YYYY-MM-DD). */
export function dillunsDe(dia: string): string {
  const dow = new Date(`${dia}T00:00:00Z`).getUTCDay(); // 0 = diumenge
  return sumaDiesDia(dia, -((dow + 6) % 7));
}

/**
 * Rang SENCER del període triat: a la planificació el mes en curs arriba fins a
 * final de mes (no s'atura avui, perquè cal veure el que ve).
 */
export function rangSencer(e: EstatPeriode, avui: string): { desde: string; fins: string } {
  if (e.tipus === 'per') return { desde: e.desde, fins: e.fins };
  const { desde } = rangPeriode(e.tipus, e.off, avui);
  const [y, m] = desde.split('-').map(Number) as [number, number];
  const mesos = e.tipus === 'mes' ? 1 : e.tipus === 'tri' ? 3 : 12;
  const fins = new Date(Date.UTC(y, m - 1 + mesos, 0)).toISOString().slice(0, 10);
  return { desde, fins };
}

const ordreHab = (a: HabDia, b: HabDia) =>
  (a.habitacioId === null ? 1 : 0) - (b.habitacioId === null ? 1 : 0) || a.nom.localeCompare(b.nom, 'ca', { numeric: true });

/** Agrupa planificacions, tasques, notes i pagaments en setmanes (de dilluns a diumenge). */
export function construeixSetmanes(i: {
  desde: string;
  fins: string;
  plans: PlaInput[];
  tasques: TascaInput[];
  notes: NotaInput[];
  jornades: JornadaInput[];
}): SetmanaNeteja[] {
  const dies = new Map<string, DiaNeteja>();
  const dia = (d: string): DiaNeteja => {
    let x = dies.get(d);
    if (!x) {
      x = { data: d, treballadorId: null, habitacions: [], nota: null, fet: false, pagament: null };
      dies.set(d, x);
    }
    return x;
  };

  for (const t of i.tasques) {
    const d = dia(t.data);
    d.fet = true;
    d.treballadorId = d.treballadorId ?? t.treballadorId;
    d.habitacions.push({
      id: t.id,
      origen: 'FETA',
      habitacioId: t.habitacioId,
      nom: t.habitacio ?? 'Zones comunes',
      tipus: t.tipus,
      nota: t.notes,
      bugaderia: t.bugaderia,
    });
  }
  for (const p of i.plans) {
    const d = dia(p.data);
    if (d.habitacions.some((h) => h.origen === 'FETA' && h.habitacioId === p.habitacioId)) continue;
    d.treballadorId = d.treballadorId ?? p.treballadorId;
    d.habitacions.push({ id: p.id, origen: 'PLA', habitacioId: p.habitacioId, nom: p.habitacio, tipus: p.tipus, nota: p.nota, bugaderia: false });
  }
  for (const n of i.notes) if (n.ambit === 'DIA') dia(n.data).nota = n;
  for (const j of i.jornades) {
    const d = dies.get(j.data);
    if (!d) continue;
    d.pagament = !j.pagada ? 'PER_PAGAR' : d.pagament === 'PER_PAGAR' ? 'PER_PAGAR' : 'PAGAT';
  }
  for (const d of dies.values()) d.habitacions.sort(ordreHab);

  const out: SetmanaNeteja[] = [];
  for (let dl = dillunsDe(i.desde); dl <= i.fins; dl = sumaDiesDia(dl, 7)) {
    const dg = sumaDiesDia(dl, 6);
    out.push({
      dilluns: dl,
      diumenge: dg,
      nota: i.notes.find((n) => n.ambit === 'SETMANA' && n.data === dl) ?? null,
      dies: [...dies.values()]
        .filter((d) => d.data >= dl && d.data <= dg && d.data >= i.desde && d.data <= i.fins)
        .sort((a, b) => a.data.localeCompare(b.data)),
    });
  }
  return out;
}

/** Sortida si aquell dia marxa algú de l'habitació; si no, manteniment. */
export const tipusProposat = (data: string, habitacioId: string, sortides: Set<string>): TipusNeteja =>
  sortides.has(`${data}|${habitacioId}`) ? 'CANVI_COMPLET' : 'REPAS';

/**
 * «Repetir la setmana passada»: les mateixes habitacions i dies, una setmana més
 * tard. El tipus es torna a proposar (sortida només si aquell dia marxa algú); les
 * observacions no es copien. Les habitacions que ja hi són, no es dupliquen.
 */
export function copiaSetmana(
  origen: { data: string; habitacioId: string; treballadorId: string | null }[],
  sortides: Set<string>,
  jaHiSon: Set<string> = new Set(),
): { data: string; habitacioId: string; treballadorId: string | null; tipus: TipusNeteja }[] {
  const out: { data: string; habitacioId: string; treballadorId: string | null; tipus: TipusNeteja }[] = [];
  const vistos = new Set(jaHiSon);
  for (const o of origen) {
    const data = sumaDiesDia(o.data, 7);
    const k = `${data}|${o.habitacioId}`;
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push({ data, habitacioId: o.habitacioId, treballadorId: o.treballadorId, tipus: tipusProposat(data, o.habitacioId, sortides) });
  }
  return out;
}
