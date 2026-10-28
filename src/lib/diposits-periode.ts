/**
 * Dipòsits i fiances d'un període (trimestre): diners EN CUSTÒDIA, no factures.
 * Pur i testejat. Un dipòsit es rep un dia i, més endavant (potser en un altre
 * trimestre), es TORNA (mai és ingrés) o es RETÉ (passa a ingrés, sense IVA, el
 * dia que es reté). Mentre no es resol, passa de trimestre en trimestre com a
 * pendent. Retenció parcial: es queda `importRetingut` i la resta es torna.
 */

export type EstatDiposit = 'EN_CUSTODIA' | 'TORNAT' | 'RETINGUT';

export interface DipositBase {
  import: number;
  data: Date; // quan es rep
  estat: EstatDiposit;
  dataResolucio: Date | null; // quan es torna o es reté
  importRetingut: number | null; // retenció parcial; null = tot
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** El que s'ha quedat l'hostal (ingrés sense IVA). */
export function importRetingutDe(d: Pick<DipositBase, 'estat' | 'import' | 'importRetingut'>): number {
  return d.estat === 'RETINGUT' ? r2(d.importRetingut ?? d.import) : 0;
}

/** El que s'ha tornat a l'hoste (mai és ingrés). */
export function importTornatDe(d: Pick<DipositBase, 'estat' | 'import' | 'importRetingut'>): number {
  if (d.estat === 'TORNAT') return r2(d.import);
  if (d.estat === 'RETINGUT') return r2(d.import - importRetingutDe(d));
  return 0;
}

/** Encara en custòdia al final del dia `dia`? (rebut fins aquell dia i no resolt abans). */
export function pendentA<T extends DipositBase>(d: T, dia: Date): boolean {
  if (d.data > dia) return false;
  return d.estat === 'EN_CUSTODIA' || !d.dataResolucio || d.dataResolucio > dia;
}

export interface MovimentsPeriode<T> {
  /** Pendents que venen de períodes anteriors (rebuts abans i no resolts a l'inici). */
  anteriors: T[];
  /** Rebuts dins del període. */
  rebuts: T[];
  /** Tornats (tot o la part tornada) dins del període. */
  tornats: T[];
  /** Retinguts dins del període: ingrés del període. */
  retinguts: T[];
  /** Pendents al tancament: passen al període següent. */
  pendents: T[];
  totals: { anteriors: number; rebuts: number; tornats: number; retinguts: number; pendents: number };
}

/**
 * Classifica els dipòsits en el període [inici, fi]. Quadra sempre:
 * anteriors + rebuts − tornats − retinguts = pendents.
 */
export function movimentsPeriode<T extends DipositBase>(ds: T[], inici: Date, fi: Date): MovimentsPeriode<T> {
  const dins = (x: Date | null) => !!x && x >= inici && x <= fi;
  const resoltDins = (d: T) => d.estat !== 'EN_CUSTODIA' && dins(d.dataResolucio);
  const abansInici = new Date(inici.getTime() - 1);

  const anteriors = ds.filter((d) => pendentA(d, abansInici));
  const rebuts = ds.filter((d) => dins(d.data));
  const tornats = ds.filter((d) => resoltDins(d) && importTornatDe(d) > 0);
  const retinguts = ds.filter((d) => resoltDins(d) && d.estat === 'RETINGUT');
  const pendents = ds.filter((d) => pendentA(d, fi));
  const suma = (xs: T[], f: (d: T) => number) => r2(xs.reduce((a, d) => a + f(d), 0));

  return {
    anteriors,
    rebuts,
    tornats,
    retinguts,
    pendents,
    totals: {
      anteriors: suma(anteriors, (d) => d.import),
      rebuts: suma(rebuts, (d) => d.import),
      tornats: suma(tornats, importTornatDe),
      retinguts: suma(retinguts, importRetingutDe),
      pendents: suma(pendents, (d) => d.import),
    },
  };
}
