/**
 * Taxa turística (IEET) per ESTADES, no per factures. Regles de l'hostal:
 * - Només paga la PRIMERA estada d'un hoste: una ampliació (estanciaOrigenId) o
 *   una estada que comença el dia (o l'endemà) que n'acaba una altra d'algun
 *   dels mateixos hostes és continuació i no paga (ni surt a la llista).
 * - Paguen les nits fins a un màxim (7) × tarifa (0,90 €) per persona.
 * - Els menors de l'edat mínima (17) surten a 0 €.
 * - Només hi surten les estades ja acabades i amb número de contracte.
 * El trimestre és el de la data d'entrada.
 */

export interface ConfigIeet { tarifa: number; maxNits: number; edatMinima: number }

export interface ViatgerIeet {
  huespedId: string;
  habitacio: string | null;
  nom: string;
  cognom1: string;
  cognom2: string | null;
  tipusDocument: string | null;
  numDocument: string | null;
  nacionalitat: string | null;
  dataNaixement: Date | null;
  adreca: string | null;
  codiPostal: string | null;
  municipi: string | null;
  localitat: string | null;
  pais: string | null;
  telefon: string | null;
  email: string | null;
}

export interface EstadaIeet {
  id: string;
  numContracte: string | null;
  dataEntrada: Date;
  dataSortida: Date;
  estanciaOrigenId: string | null;
  habitacio: string | null;
  viatgers: ViatgerIeet[];
}

export interface FilaIeet {
  estadaId: string;
  huespedId: string;
  contracte: string;
  habitacio: string;
  entrada: string; // YYYY-MM-DD
  sortida: string;
  nitsEstada: number;
  nitsPaguen: number;
  nom: string; // COGNOMS, NOM
  tipusDocument: string | null;
  numDocument: string;
  nacionalitat: string;
  dataNaixement: string | null; // YYYY-MM-DD
  edat: number | null;
  adreca: string;
  codiPostal: string;
  municipi: string;
  pais: string;
  telefon: string;
  email: string;
  menor: boolean;
  import: number;
  trimestre: string; // "2026-T3"
  /** Dades que falten a la fitxa (etiquetes per mostrar). */
  falten: string[];
}

const DIA = 86_400_000;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
/** Data sense hora (UTC), per comptar nits sense que l'hora o la zona hi influeixin. */
const dia = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const iso = (d: Date) => new Date(dia(d)).toISOString().slice(0, 10);

/** Número de contracte visible (26002_1 → 26002.1); null si no en té. */
export function contracteVisible(num: string | null): string | null {
  const n = (num ?? '').trim().replace(/_/g, '.');
  return n && !n.startsWith('.') ? n : null;
}

export function edatA(naixement: Date, data: Date): number {
  const a = data.getUTCFullYear() - naixement.getUTCFullYear();
  const abans =
    data.getUTCMonth() < naixement.getUTCMonth() ||
    (data.getUTCMonth() === naixement.getUTCMonth() && data.getUTCDate() < naixement.getUTCDate());
  return abans ? a - 1 : a;
}

/** Estada anterior de la qual aquesta és continuació (o null si és la primera). */
export function estadaAnterior(e: EstadaIeet, totes: EstadaIeet[]): EstadaIeet | null {
  if (e.estanciaOrigenId) {
    const o = totes.find((x) => x.id === e.estanciaOrigenId);
    if (o) return o;
  }
  const hostes = new Set(e.viatgers.map((v) => v.huespedId));
  const entrada = dia(e.dataEntrada);
  let prev: EstadaIeet | null = null;
  for (const o of totes) {
    if (o.id === e.id || dia(o.dataEntrada) >= entrada) continue;
    const salt = entrada - dia(o.dataSortida);
    if (salt < 0 || salt > DIA) continue;
    if (o.viatgers.some((v) => hostes.has(v.huespedId))) prev = o;
  }
  return prev;
}

export function calculaIeet(totes: EstadaIeet[], cfg: ConfigIeet, avui: Date): FilaIeet[] {
  const fiAvui = dia(avui);
  const files: FilaIeet[] = [];
  const ordenades = [...totes].sort((a, b) => dia(a.dataEntrada) - dia(b.dataEntrada));
  for (const e of ordenades) {
    const contracte = contracteVisible(e.numContracte);
    if (!contracte) continue;
    if (dia(e.dataSortida) > fiAvui) continue; // encara no s'ha acabat
    if (estadaAnterior(e, totes)) continue; // continuació: no paga
    const nitsEstada = Math.max(0, Math.round((dia(e.dataSortida) - dia(e.dataEntrada)) / DIA));
    const nitsPaguen = Math.min(nitsEstada, cfg.maxNits);
    const trimestre = `${e.dataEntrada.getUTCFullYear()}-T${Math.floor(e.dataEntrada.getUTCMonth() / 3) + 1}`;
    for (const v of e.viatgers) {
      const edat = v.dataNaixement ? edatA(v.dataNaixement, e.dataEntrada) : null;
      const menor = edat !== null && edat < cfg.edatMinima;
      const habitacio = v.habitacio ?? e.habitacio ?? '';
      const municipi = v.municipi || v.localitat || '';
      // Dades que falten. El document no cal als menors de 14 anys; el telèfon i
      // el correu, tampoc als menors (els dona el titular).
      const falten: string[] = [];
      if (!habitacio) falten.push('habitació');
      if (!(edat !== null && edat < 14)) {
        if (!v.tipusDocument || !v.numDocument) falten.push('document');
      }
      if (!v.nacionalitat) falten.push('nacionalitat');
      if (!v.dataNaixement) falten.push('data de naixement');
      if (!v.adreca) falten.push('domicili');
      if (!municipi) falten.push('municipi');
      if (!v.pais) falten.push('país');
      if (!menor) {
        if (!v.telefon) falten.push('telèfon');
        if (!v.email) falten.push('correu');
      }
      files.push({
        estadaId: e.id,
        huespedId: v.huespedId,
        contracte,
        habitacio,
        entrada: iso(e.dataEntrada),
        sortida: iso(e.dataSortida),
        nitsEstada,
        nitsPaguen,
        nom: [[v.cognom1, v.cognom2].filter(Boolean).join(' '), v.nom].filter(Boolean).join(', ').toUpperCase(),
        tipusDocument: v.tipusDocument,
        numDocument: v.numDocument ?? '',
        nacionalitat: v.nacionalitat ?? '',
        dataNaixement: v.dataNaixement ? iso(v.dataNaixement) : null,
        edat,
        adreca: v.adreca ?? '',
        codiPostal: v.codiPostal ?? '',
        municipi,
        pais: v.pais ?? '',
        telefon: v.telefon ?? '',
        email: v.email ?? '',
        menor,
        import: menor ? 0 : round2(nitsPaguen * cfg.tarifa),
        trimestre,
        falten,
      });
    }
  }
  return files;
}

export interface ResumIeet { trimestre: string; persones: number; personesPaguen: number; nitsPaguen: number; import: number }

/** Totals per trimestre (només de les persones que paguen). */
export function resumIeet(files: FilaIeet[]): ResumIeet[] {
  const m = new Map<string, ResumIeet>();
  for (const f of files) {
    const r = m.get(f.trimestre) ?? { trimestre: f.trimestre, persones: 0, personesPaguen: 0, nitsPaguen: 0, import: 0 };
    r.persones += 1;
    if (f.import > 0) {
      r.personesPaguen += 1;
      r.nitsPaguen += f.nitsPaguen;
      r.import = round2(r.import + f.import);
    }
    m.set(f.trimestre, r);
  }
  return [...m.values()].sort((a, b) => a.trimestre.localeCompare(b.trimestre));
}
