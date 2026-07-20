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

/** IVA general de les despeses (proveïdors): 21%, sol venir IVA inclòs al total. */
const IVA_DESPESA = 21;

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
  return gastos.map((g) => {
    const total = Number(g.import);
    const base = round2(total / (1 + IVA_DESPESA / 100));
    return {
      data: g.data.toISOString(),
      nif: g.proveidor?.cif ?? '',
      proveidor: g.proveidor?.nom ?? g.descripcio,
      numFactura: g.numFactura ?? '',
      base,
      ivaPercent: IVA_DESPESA,
      iva: round2(total - base),
      // Sense retenció d'IRPF per defecte (només l'aplica el lloguer i alguns
      // serveis professionals; s'ajusta a mà a la fila corresponent).
      irpfPercent: 0,
      irpf: 0,
      total,
    };
  });
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

  const files: FilaIngres[] = factures.map((f) => {
    const esFiscal = f.tipusDocument === 'FACTURA';
    const h = f.estancia?.viatgers[0]?.huesped ?? null;
    const nom = h ? [h.nom, h.cognom1, h.cognom2].filter(Boolean).join(' ').toUpperCase() : '—';
    const total = Number(f.total);
    const esAbono = total < 0;
    const { base, iva, ivaPercent } = desglossaIva(total, Number(f.base), Number(f.iva));
    const periode =
      f.estancia?.dataEntrada && f.estancia?.dataSortida
        ? `${fmtCurt(f.estancia.dataEntrada)} - ${fmtCurt(f.estancia.dataSortida)}`
        : '';
    // Número sense el prefix d'any intern (2026-0001 → 0001); les simplificades
    // per contracte (26001, 26001.1) es queden tal qual.
    const numeroNet = f.numero.replace(/^\d{4}-/, '');
    return {
      data: f.data.toISOString(),
      numeroSimple: esFiscal ? '' : numeroNet,
      numeroFiscal: esFiscal ? numeroNet : '',
      client: esAbono ? `${nom} (ABONO)` : nom,
      periode,
      base,
      ivaPercent,
      iva,
      total,
      esAbono,
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
