import { ocultaDelLlibre } from '@/lib/auth/restriccions';

/**
 * Full d'ocupació per CONTRACTE (pur, testejat; el període i la selecció de persones es fan al servei). Un contracte = una estada i totes les
 * seves ampliacions (cadena `estanciaOrigenId`); el nom i el telèfon surten un sol cop.
 * Cada tram (estada o ampliació) porta: import, «Del X al Y» i els pagaments amb el
 * dia i, només si en tenen, el número de factura. El número de contracte també és
 * opcional: els que no en tenen van al final de la mateixa llista.
 */

export interface EstadaFull {
  id: string;
  origenId: string | null;
  numContracte: string | null;
  habitacio: string | null;
  entrada: string | null; // YYYY-MM-DD
  sortida: string | null;
  observacions: string | null;
  viatgers: { id: string; nom: string; telefon: string | null; esTitular: boolean }[];
  cobraments: { import: number; data: string; metode: string; factura: string | null }[];
  previstos: { import: number; dataPrevista: string; pagat: boolean }[];
}

export interface PagamentFull {
  import: number;
  data: string;
  /** Número de factura, només si el cobrament en té. */
  factura: string | null;
}

export interface TramFull {
  id: string;
  /** Cobrat + previst pendent; null si encara no hi ha cap dada. */
  import: number | null;
  del: string | null;
  al: string | null;
  pagaments: PagamentFull[];
  pendents: { import: number; data: string }[];
}

export interface ContracteFull {
  clau: string;
  /** Número de contracte (el de l'estada inicial), o null si no en té. */
  numero: string | null;
  habitacions: string[];
  persones: { id: string; nom: string; telefon: string | null }[];
  trams: TramFull[];
  notes: string | null;
}

export interface OpcionsFull {
  /** Comptes de propietat: s'oculten les estades amb ZP11 i els cobraments «Altres». */
  restringit?: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** «26014_1» → 26014 · per ordenar els contractes (i les seves ampliacions juntes). */
const base = (n: string) => n.split('_')[0]!;

export function construeixFull(estades: EstadaFull[], o: OpcionsFull): ContracteFull[] {
  const perId = new Map(estades.map((e) => [e.id, e]));
  const arrel = (e: EstadaFull): string => {
    let c = e;
    const vistos = new Set<string>();
    while (c.origenId && perId.has(c.origenId) && !vistos.has(c.id)) {
      vistos.add(c.id);
      c = perId.get(c.origenId)!;
    }
    // Si l'origen no és al període, el grup es lliga a l'origen igualment.
    return c.origenId && !perId.has(c.origenId) ? c.origenId : c.id;
  };

  const grups = new Map<string, EstadaFull[]>();
  for (const e of estades) {
    if (o.restringit && ocultaDelLlibre(e.observacions)) continue;
    const k = arrel(e);
    grups.set(k, [...(grups.get(k) ?? []), e]);
  }

  const out: ContracteFull[] = [];
  for (const [clau, tots] of grups) {
    const ordenats = [...tots].sort((a, b) => (a.entrada ?? '').localeCompare(b.entrada ?? ''));

    const persones: ContracteFull['persones'] = [];
    for (const e of ordenats) {
      for (const v of [...e.viatgers].sort((a, b) => Number(b.esTitular) - Number(a.esTitular))) {
        const ja = persones.find((p) => p.id === v.id);
        if (ja) ja.telefon = ja.telefon ?? v.telefon;
        else persones.push({ id: v.id, nom: v.nom, telefon: v.telefon });
      }
    }

    const trams: TramFull[] = ordenats.map((e) => {
      const cobraments = o.restringit ? e.cobraments.filter((c) => c.metode !== 'ALTRES') : e.cobraments;
      const pagaments = [...cobraments]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((c) => ({ import: c.import, data: c.data, factura: c.factura }));
      const pendents = e.previstos.filter((p) => !p.pagat).map((p) => ({ import: p.import, data: p.dataPrevista }));
      const total = r2(pagaments.reduce((a, p) => a + p.import, 0) + pendents.reduce((a, p) => a + p.import, 0));
      return { id: e.id, import: total > 0 ? total : null, del: e.entrada, al: e.sortida, pagaments, pendents };
    });

    const numeros = ordenats.map((e) => e.numContracte?.trim()).filter((n): n is string => !!n);
    const habitacions = [...new Set(ordenats.map((e) => e.habitacio).filter((h): h is string => !!h))];
    const notes = o.restringit ? null : ordenats.map((e) => e.observacions?.trim()).filter(Boolean).pop() ?? null;
    out.push({ clau, numero: numeros[0] ? base(numeros[0]) : null, habitacions, persones, trams, notes });
  }

  // Per número de contracte (numèric); els sense número, al final, per data d'entrada.
  return out.sort((a, b) => {
    if (a.numero && b.numero) return a.numero.localeCompare(b.numero, 'ca', { numeric: true });
    if (a.numero) return -1;
    if (b.numero) return 1;
    return (a.trams[0]?.del ?? '').localeCompare(b.trams[0]?.del ?? '');
  });
}
