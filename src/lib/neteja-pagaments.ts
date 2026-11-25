/**
 * Llistat de pagaments d'una treballadora de neteja (pur, testejat): agrupa els moviments del
 * seu compte (jornades de neteja + bugaderia) per dia, amb les habitacions netejades, i els
 * dies per mes. Només lectura: no canvia res.
 */
import type { MovimentCompte } from './services/compte-treballador';

export interface TascaDia {
  /** `YYYY-MM-DD`. */
  dia: string;
  /** null = zones comunes. */
  habitacio: string | null;
  tipus: 'CANVI_COMPLET' | 'REPAS';
  nota: string | null;
}

export interface DiaPagament {
  dia: string;
  /** «5 sortida», «2 mant.», «Zones comunes»… */
  habitacions: string[];
  notesHab: string[];
  nota: string | null;
  bugaderia: number;
  total: number;
  pagat: number;
  pendent: number;
  /** Darrer dia en què es va pagar alguna cosa d'aquest dia. */
  pagatEl: string | null;
  sortides: number;
  manteniments: number;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Un registre per dia, de l'antic al recent. Amb `nomesPendent`, només queda el que falta pagar
 * (els imports són els pendents) i els dies sense res pendent desapareixen.
 */
export function resumeixDies(
  moviments: MovimentCompte[],
  tasques: TascaDia[],
  notes: Map<string, string>,
  nomesPendent: boolean,
): DiaPagament[] {
  const mov = nomesPendent ? moviments.filter((m) => !m.pagat) : moviments;
  const dies = new Map<string, DiaPagament>();
  const dia = (d: string): DiaPagament => {
    let x = dies.get(d);
    if (!x) {
      x = { dia: d, habitacions: [], notesHab: [], nota: notes.get(d) ?? null, bugaderia: 0, total: 0, pagat: 0, pendent: 0, pagatEl: null, sortides: 0, manteniments: 0 };
      dies.set(d, x);
    }
    return x;
  };

  for (const m of mov) {
    const d = dia(m.dia);
    if (m.tipus === 'BUGADERIA') d.bugaderia = r2(d.bugaderia + m.import);
    d.total = r2(d.total + m.import);
    if (m.pagat) {
      d.pagat = r2(d.pagat + m.import);
      if (m.pagatEl && (!d.pagatEl || m.pagatEl > d.pagatEl)) d.pagatEl = m.pagatEl;
    } else {
      d.pendent = r2(d.pendent + m.import);
    }
  }

  // Habitacions netejades: només dels dies que surten al llistat.
  const perDia = new Map<string, TascaDia[]>();
  for (const t of tasques) perDia.set(t.dia, [...(perDia.get(t.dia) ?? []), t]);
  for (const d of dies.values()) {
    const ts = perDia.get(d.dia) ?? [];
    const etiquetes = ts
      .map((t) => ({ nom: t.habitacio ?? '', text: t.habitacio ? `${t.habitacio} ${t.tipus === 'CANVI_COMPLET' ? 'sortida' : 'mant.'}` : 'Zones comunes' }))
      .sort((a, b) => (a.nom === '' ? 1 : 0) - (b.nom === '' ? 1 : 0) || a.nom.localeCompare(b.nom, 'ca', { numeric: true }));
    d.habitacions = [...new Set(etiquetes.map((e) => e.text))];
    d.notesHab = ts.filter((t) => t.nota && t.habitacio).map((t) => `Hab. ${t.habitacio}: ${t.nota}`);
    d.sortides = ts.filter((t) => t.habitacio && t.tipus === 'CANVI_COMPLET').length;
    d.manteniments = ts.filter((t) => t.habitacio && t.tipus === 'REPAS').length;
  }

  return [...dies.values()].sort((a, b) => a.dia.localeCompare(b.dia));
}

/** Els dies (ja ordenats) agrupats per mes `YYYY-MM`. */
export function agrupaPerMes(dies: DiaPagament[]): { mes: string; dies: DiaPagament[] }[] {
  const out: { mes: string; dies: DiaPagament[] }[] = [];
  for (const d of dies) {
    const mes = d.dia.slice(0, 7);
    const ultim = out[out.length - 1];
    if (ultim && ultim.mes === mes) ultim.dies.push(d);
    else out.push({ mes, dies: [d] });
  }
  return out;
}
