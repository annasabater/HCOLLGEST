/**
 * Informe d'ingressos (Balanç → Imprimir): els cobraments d'un període pel dia que
 * entren, resumits per forma de cobrament i amb el detall (dia, client, habitació,
 * factura, forma i import). Lògica pura (la càrrega és a `services/informes-ingressos.ts`).
 *
 * - Sense fiances (per defecte): només els cobraments, com el resultat real.
 * - Amb fiances: s'hi afegeixen els dipòsits/fiances rebuts, a part (columna «Fiança»).
 */
export type ModeFiances = 'sense' | 'amb' | 'tot';

export interface IngresInforme {
  data: string; // YYYY-MM-DD
  import: number;
  metode: string;
  client: string;
  habitacio: string | null;
  factura: string | null;
  /** És un dipòsit / fiança (no un cobrament). */
  fianca?: boolean;
}

export interface FilaMetode {
  metode: string;
  n: number;
  cobrat: number;
  fianca: number;
  total: number;
}

export interface InformeIngressos {
  perMetode: FilaMetode[];
  detall: IngresInforme[];
  total: { n: number; cobrat: number; fianca: number; total: number };
}

export const NOM_METODE: Record<string, string> = {
  EFECTIU: 'Efectiu',
  TARGETA: 'Targeta',
  TRANSFERENCIA: 'Transferència',
  BIZUM: 'Bizum',
  ALTRES: 'Altres',
};
const ORDRE = ['EFECTIU', 'TARGETA', 'TRANSFERENCIA', 'BIZUM', 'ALTRES'];
const r2 = (n: number) => Math.round(n * 100) / 100;

export function informeIngressos(ingressos: IngresInforme[], ambFiances: boolean): InformeIngressos {
  const detall = ingressos
    .filter((i) => ambFiances || !i.fianca)
    .sort((a, b) => a.data.localeCompare(b.data) || a.client.localeCompare(b.client, 'ca'));
  const mapa = new Map<string, FilaMetode>();
  for (const i of detall) {
    const f = mapa.get(i.metode) ?? { metode: i.metode, n: 0, cobrat: 0, fianca: 0, total: 0 };
    f.n += 1;
    if (i.fianca) f.fianca += i.import;
    else f.cobrat += i.import;
    f.total += i.import;
    mapa.set(i.metode, f);
  }
  const perMetode = [...mapa.values()]
    .map((f) => ({ ...f, cobrat: r2(f.cobrat), fianca: r2(f.fianca), total: r2(f.total) }))
    .sort((a, b) => (ORDRE.indexOf(a.metode) + 99) % 99 - (ORDRE.indexOf(b.metode) + 99) % 99);
  return {
    perMetode,
    detall,
    total: {
      n: detall.length,
      cobrat: r2(perMetode.reduce((a, f) => a + f.cobrat, 0)),
      fianca: r2(perMetode.reduce((a, f) => a + f.fianca, 0)),
      total: r2(perMetode.reduce((a, f) => a + f.total, 0)),
    },
  };
}

/** CSV d'un informe (sense BOM): el resum per forma de cobrament i el detall. */
export function csvIngressos(inf: InformeIngressos, ambFiances: boolean, titol?: string): string {
  const cel = (c: string | number) => `"${String(c).replace(/"/g, '""')}"`;
  const dec = (n: number) => n.toFixed(2).replace('.', ',');
  const dia = (iso: string) => iso.split('-').reverse().join('/');
  const nom = (m: string) => NOM_METODE[m] ?? m;
  const files: (string | number)[][] = [
    ...(titol ? [[titol]] : []),
    ['Forma de cobrament', 'Cobraments', ...(ambFiances ? ['Cobrat', 'Fiances'] : []), 'Total'],
    ...inf.perMetode.map((f) => [nom(f.metode), f.n, ...(ambFiances ? [dec(f.cobrat), dec(f.fianca)] : []), dec(f.total)]),
    ['Total', inf.total.n, ...(ambFiances ? [dec(inf.total.cobrat), dec(inf.total.fianca)] : []), dec(inf.total.total)],
    [],
    ['Dia', 'Client', 'Habitació', 'Factura', 'Forma', ...(ambFiances ? ['Tipus'] : []), 'Import'],
    ...inf.detall.map((i) => [dia(i.data), i.client, i.habitacio ?? '', i.factura ?? '', nom(i.metode), ...(ambFiances ? [i.fianca ? 'Fiança' : 'Cobrament'] : []), dec(i.import)]),
  ];
  return files.map((r) => r.map(cel).join(';')).join('\r\n');
}
