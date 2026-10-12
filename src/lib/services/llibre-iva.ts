/**
 * Llibre d'IVA trimestral — part d'INGRESSOS (facturas emitidas / repercutidas +
 * libro de ingresos). Reprodueix el quadernet que es lliura a la gestoria: una
 * fila per factura del trimestre (simplificada o fiscal), amb base imposable,
 * %IVA, IVA i total, més el període d'estada i el client. Les factures d'abono
 * (rectificatives, total negatiu) surten amb import negatiu, com al llibre real.
 *
 * NOMÉS ingressos de moment: la part de despeses (facturas soportadas) i el
 * resum Repercutit/Suportat necessiten el desglossament d'IVA als gastos, que
 * encara no es guarda.
 */
import 'server-only';
import { prisma } from '../db';
import { periodeDelText } from '../periode-factura';
import { liniesIva } from '../gasto-iva';

export interface FilaIngres {
  data: string; // ISO
  numeroSimple: string; // Nº Factura S. (simplificada) — buit si és fiscal
  numeroFiscal: string; // Nº Factura F. (fiscal) — buit si és simplificada
  client: string;
  periode: string; // "28/06/26 - 01/07/26"
  base: number;
  ivaPercent: number;
  iva: number;
  total: number;
  esAbono: boolean;
  /** Import del dipòsit si la fila és un document de dipòsit (NO és ingrés). */
  diposit: number;
}

export interface LlibreIngressos {
  any: number;
  trimestre: number;
  etiqueta: string; // "2º TRIMESTRE 2026"
  files: FilaIngres[];
  totalBase: number;
  totalIva: number;
  totalTotal: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** IVA de l'allotjament (hostaleria): 10%, i el preu es cobra IVA inclòs. */
const IVA_ALLOTJAMENT = 10;

/**
 * Desglossament base/IVA d'una factura. Les factures d'allotjament es guarden
 * amb el TOTAL com a base i IVA 0 (no es desglossa a l'app); fiscalment el preu
 * és "IVA inclòs" al 10%, així que quan l'IVA guardat és 0 el derivem del total
 * (base = total/1,10, IVA = total − base). Si ja hi ha IVA guardat, es respecta.
 */
function desglossaIva(total: number, baseGuardada: number, ivaGuardat: number): { base: number; iva: number; ivaPercent: number } {
  if (ivaGuardat !== 0) {
    const ivaPercent = baseGuardada !== 0 ? round2((ivaGuardat / baseGuardada) * 100) : 0;
    return { base: baseGuardada, iva: ivaGuardat, ivaPercent };
  }
  const base = round2(total / (1 + IVA_ALLOTJAMENT / 100));
  return { base, iva: round2(total - base), ivaPercent: IVA_ALLOTJAMENT };
}

function fmtCurt(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** Trimestre 1–4 → rang de dates [inici, fi] de l'any. */
export function rangTrimestre(year: number, trimestre: number): { start: Date; end: Date } {
  const m0 = (trimestre - 1) * 3;
  return {
    start: new Date(year, m0, 1, 0, 0, 0, 0),
    end: new Date(year, m0 + 3, 0, 23, 59, 59, 999),
  };
}


export interface FilaGasto {
  data: string; // ISO
  nif: string;
  proveidor: string;
  numFactura: string;
  base: number;
  ivaPercent: number;
  iva: number;
  irpfPercent: number; // retenció d'IRPF (p. ex. lloguer de local 19%); 0 si no en té
  irpf: number;
  total: number; // base + IVA − IRPF (el que es paga de veritat)
}

/**
 * Despeses del trimestre com a "facturas recibidas / soportadas". Els gastos es
 * guarden amb el TOTAL però sense desglossament d'IVA ni nº de factura del
 * proveïdor; per defecte assumim IVA 21% inclòs (base = total/1,21) — a la
 * impressió tot és editable, així que si una despesa és al 10% o exempta es
 * corregeix a mà. Exclou les fiances/dipòsits (esFianca) i les despeses sense
 * IVA reals es poden ajustar posant %IVA = 0.
 */
export async function getGastosSoportats(year: number, trimestre: number): Promise<FilaGasto[]> {
  const { start, end } = rangTrimestre(year, trimestre);
  const gastos = await prisma.gasto.findMany({
    where: { deletedAt: null, esFianca: false, data: { gte: start, lte: end } },
    orderBy: [{ data: 'asc' }],
    include: { proveidor: { select: { nom: true, cif: true } } },
  });
  // Una fila per tipus d'IVA: una factura amb aigua al 10% i conservació al 21%
  // surt en dues files amb el mateix número (com al llibre de factures rebudes).
  // L'IRPF (lloguers) es reparteix sobre la base de cada línia.
  return gastos.flatMap((g) => {
    const irpfPercent = g.irpfPercent != null ? Number(g.irpfPercent) : 0;
    const linies = liniesIva(g);
    return linies.map((l) => {
      const irpf = round2(l.base * (irpfPercent / 100));
      return {
        data: g.data.toISOString(),
        nif: g.proveidor?.cif ?? '',
        proveidor: g.proveidor?.nom ?? g.descripcio,
        numFactura: g.numFactura ?? '',
        base: l.base,
        ivaPercent: l.ivaPercent,
        iva: l.iva,
        irpfPercent,
        irpf,
        // Una sola línia: el total real pagat; diverses: el de cada línia.
        total: linies.length === 1 ? Number(g.import) : round2(l.base + l.iva - irpf),
      };
    });
  });
}

/**
 * Fiances/dipòsits del trimestre (esFianca=true). Serveix per garantir que una
 * despesa marcada com a fiança MAI aparegui al trimestre, ni tan sols si havia
 * quedat en un snapshot desat abans de marcar-la. Retorna signatures per casar
 * amb les files desades (total + nº factura / NIF / proveïdor).
 */
export async function getFiancesSoportades(
  year: number,
  trimestre: number,
): Promise<{ total: number; numFactura: string; nif: string; proveidor: string }[]> {
  const { start, end } = rangTrimestre(year, trimestre);
  const fiances = await prisma.gasto.findMany({
    where: { deletedAt: null, esFianca: true, data: { gte: start, lte: end } },
    include: { proveidor: { select: { nom: true, cif: true } } },
  });
  return fiances.map((g) => ({
    total: round2(Number(g.import)),
    numFactura: g.numFactura ?? '',
    nif: g.proveidor?.cif ?? '',
    proveidor: g.proveidor?.nom ?? g.descripcio,
  }));
}

export async function getLlibreIngressos(year: number, trimestre: number): Promise<LlibreIngressos> {
  const { start, end } = rangTrimestre(year, trimestre);

  // Només documents que són factura fiscal: FACTURA (F1) i FACTURA_SIMPLIFICADA (F2).
  // Els RECIBO no són factures i no entren al llibre d'IVA. Ordre per número perquè
  // els abonos (26001.1) surtin just després de la seva factura (26001).
  const factures = await prisma.factura.findMany({
    where: {
      deletedAt: null,
      data: { gte: start, lte: end },
      tipusDocument: { in: ['FACTURA', 'FACTURA_SIMPLIFICADA'] },
    },
    orderBy: [{ numero: 'asc' }],
    include: {
      facturaFiscal: { select: { numero: true } },
      simplificades: { select: { id: true }, take: 1 },
      diposits: { select: { import: true } },
      linies: { select: { import: true, descripcio: true, detall: true } },
      estancia: {
        select: {
          dataEntrada: true,
          dataSortida: true,
          viatgers: {
            where: { esTitular: true },
            take: 1,
            select: { huesped: { select: { nom: true, cognom1: true, cognom2: true } } },
          },
        },
      },
    },
  });

  const net = (n: string) => n.replace(/^\d{4}-/, '');
  const files: FilaIngres[] = factures
    // Una factura FISCAL que cobreix simplificades NO fa fila pròpia: el seu número
    // ja surt a la columna "F." de cada simplificada que cobreix (no duplica l'IVA).
    .filter((f) => !(f.tipusDocument === 'FACTURA' && f.simplificades.length > 0))
    .map((f) => {
      const esFiscal = f.tipusDocument === 'FACTURA';
      // La factura (tal com s'ha editat) mana: el client escrit a la factura i el
      // període del text de les seves línies; l'hoste i l'estada només de reserva.
      const h = f.estancia?.viatgers[0]?.huesped ?? null;
      const nomHoste = h ? [h.nom, h.cognom1, h.cognom2].filter(Boolean).join(' ') : '';
      const nom = (f.clientNom?.trim() || nomHoste || '—').toUpperCase();
      const total = Number(f.total);
      const esAbono = total < 0;
      // Document de dipòsit: ocupa el seu número a la sèrie, però base/IVA/total 0.
      const diposit = f.esDiposit
        ? round2(
            (f.diposits.length > 0 ? f.diposits : f.linies).reduce((a, x) => a + Number(x.import), 0),
          )
        : 0;
      const { base, iva, ivaPercent } = f.esDiposit
        ? { base: 0, iva: 0, ivaPercent: 0 }
        : desglossaIva(total, Number(f.base), Number(f.iva));
      const periode =
        periodeDelText(f.linies.map((l) => `${l.descripcio ?? ''} ${l.detall ?? ''}`).join(' ')) ??
        (f.estancia?.dataEntrada && f.estancia?.dataSortida
          ? `${fmtCurt(f.estancia.dataEntrada)} - ${fmtCurt(f.estancia.dataSortida)}`
          : '');
      // Número sense el prefix d'any intern (2026-0001 → 0001); les simplificades
      // per contracte (26001, 26001.1) es queden tal qual.
      return {
        data: f.data.toISOString(),
        numeroSimple: esFiscal ? '' : net(f.numero),
        // Si la simplificada té una fiscal vinculada, el seu número surt a la
        // columna "F." (la mateixa fila) i la fiscal no compta a part.
        numeroFiscal: esFiscal ? net(f.numero) : f.facturaFiscal ? net(f.facturaFiscal.numero) : '',
        client: f.esDiposit ? `${nom} (DEPÓSITO)` : esAbono ? `${nom} (ABONO)` : nom,
        periode,
        base,
        ivaPercent,
        iva,
        total,
        esAbono,
        diposit,
      };
    });

  return {
    any: year,
    trimestre,
    etiqueta: `${trimestre}º TRIMESTRE ${year}`,
    files,
    totalBase: round2(files.reduce((a, f) => a + f.base, 0)),
    totalIva: round2(files.reduce((a, f) => a + f.iva, 0)),
    totalTotal: round2(files.reduce((a, f) => a + f.total, 0)),
  };
}

// ─── Libro de gastos (format de la gestoria: base per columna + IVA per tipus) ───

/** Columnes de BASE del libro de gastos (les de la foto de la gestoria). */
export const COLUMNES_GASTO = [
  'compras5', 'compras10', 'compras21', 'impuestoLocal', 'gestoria',
  'electricidadAgua', 'reparaciones', 'gastosVarios', 'autonomos',
  'salarios', 'seguridadSocial', 'otrosSinIva',
] as const;
export type ColumnaGasto = (typeof COLUMNES_GASTO)[number];

/** Etiquetes visibles de cada columna de base. */
export const COLUMNA_GASTO_LABELS: Record<ColumnaGasto, string> = {
  compras5: 'Compras 5%',
  compras10: 'Compras 10%',
  compras21: 'Compras 21%',
  impuestoLocal: 'Impuesto local',
  gestoria: 'Gestoría',
  electricidadAgua: 'Electricidad/Agua',
  reparaciones: 'Reparaciones',
  gastosVarios: 'Gastos varios',
  autonomos: 'Autónomos',
  salarios: 'Salarios',
  seguridadSocial: 'Seguridad Social',
  otrosSinIva: 'Otros gastos sin IVA',
};

/** Mapatge categoria de l'app (minúscules) → columna de base. La resta → gastosVarios. */
const CATEGORIA_A_COLUMNA: Record<string, ColumnaGasto> = {
  aigua: 'electricidadAgua',
  electricitat: 'electricidadAgua',
  manteniment: 'reparaciones',
  reformes: 'reparaciones',
  assegurances: 'otrosSinIva',
  personal: 'salarios',
};

function columnaPerCategoria(nom: string): ColumnaGasto {
  return CATEGORIA_A_COLUMNA[nom.trim().toLowerCase()] ?? 'gastosVarios';
}

export interface FilaLibroGasto {
  data: string; // ISO (gasto) o "YYYY-MM" (nòmina)
  nif: string;
  proveidor: string;
  numFactura: string;
  bases: Record<ColumnaGasto, number>;
  iva5: number;
  iva10: number;
  iva21: number;
  total: number;
}

function basesBuides(): Record<ColumnaGasto, number> {
  return Object.fromEntries(COLUMNES_GASTO.map((c) => [c, 0])) as Record<ColumnaGasto, number>;
}

/**
 * Libro de gastos del trimestre en el format de la gestoria: cada despesa a la
 * columna de la seva categoria (base) + l'IVA a la columna del seu tipus, i les
 * nòmines del trimestre a la columna "Salarios". Autònoms i Seguridad Social no
 * es desglossen a l'app encara → columnes a 0 (editables a la impressió).
 */
export async function getLibroGastos(
  year: number,
  trimestre: number,
): Promise<{ files: FilaLibroGasto[]; totals: Record<ColumnaGasto, number>; totalIva5: number; totalIva10: number; totalIva21: number; totalTotal: number }> {
  const { start, end } = rangTrimestre(year, trimestre);
  const gastos = await prisma.gasto.findMany({
    where: { deletedAt: null, esFianca: false, data: { gte: start, lte: end } },
    orderBy: [{ data: 'asc' }],
    include: { proveidor: { select: { nom: true, cif: true } }, categoria: { select: { nom: true } } },
  });

  const files: FilaLibroGasto[] = gastos.map((g) => {
    const total = round2(Number(g.import));
    const col = columnaPerCategoria(g.categoria?.nom ?? '');
    const bases = basesBuides();
    const ivaPer = { 5: 0, 10: 0, 21: 0 };
    if (col === 'otrosSinIva') {
      // Les despeses exemptes (assegurances → otrosSinIva) van sense IVA.
      bases.otrosSinIva = total;
    } else {
      // Cada línia d'IVA: la base subjecta a la columna de la categoria, la part
      // no subjecta (0%, p. ex. el cànon de l'aigua) a «Otros gastos sin IVA», i
      // l'IVA a la columna del seu tipus.
      for (const l of liniesIva(g)) {
        if (l.ivaPercent === 0) bases.otrosSinIva = round2(bases.otrosSinIva + l.base);
        else bases[col] = round2(bases[col] + l.base);
        if (l.ivaPercent === 5) ivaPer[5] = round2(ivaPer[5] + l.iva);
        else if (l.ivaPercent === 10) ivaPer[10] = round2(ivaPer[10] + l.iva);
        else if (l.ivaPercent >= 21) ivaPer[21] = round2(ivaPer[21] + l.iva);
      }
    }
    return {
      data: g.data.toISOString(),
      nif: g.proveidor?.cif ?? '',
      proveidor: g.proveidor?.nom ?? g.descripcio,
      numFactura: g.numFactura ?? '',
      bases,
      iva5: ivaPer[5],
      iva10: ivaPer[10],
      iva21: ivaPer[21],
      total,
    };
  });

  // Nòmines del trimestre → columna Salarios (periode "YYYY-MM").
  const mesos = [1, 2, 3].map((m) => `${year}-${String((trimestre - 1) * 3 + m).padStart(2, '0')}`);
  const nomines = await prisma.nomina.findMany({
    where: { periode: { in: mesos } },
    include: { treballador: { select: { nom: true } } },
    orderBy: { periode: 'asc' },
  });
  for (const n of nomines) {
    const bases = basesBuides();
    bases.salarios = round2(Number(n.total));
    files.push({
      data: n.periode,
      nif: '',
      proveidor: n.treballador?.nom ?? 'Treballador',
      numFactura: '',
      bases,
      iva5: 0,
      iva10: 0,
      iva21: 0,
      total: round2(Number(n.total)),
    });
  }

  const totals = basesBuides();
  for (const f of files) for (const c of COLUMNES_GASTO) totals[c] = round2(totals[c] + f.bases[c]);
  return {
    files,
    totals,
    totalIva5: round2(files.reduce((a, f) => a + f.iva5, 0)),
    totalIva10: round2(files.reduce((a, f) => a + f.iva10, 0)),
    totalIva21: round2(files.reduce((a, f) => a + f.iva21, 0)),
    totalTotal: round2(files.reduce((a, f) => a + f.total, 0)),
  };
}
