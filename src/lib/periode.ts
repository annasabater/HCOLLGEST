/**
 * Rangs de dies (`YYYY-MM-DD`) per als filtres «des de – fins a».
 *
 * Tot es calcula en UTC i sobre text: els dies es desen a mitjanit UTC i
 * passar-los per l'hora local els desplaçaria un dia.
 */

const aDia = (d: Date) => d.toISOString().slice(0, 10);

/** Últim dia del mes (1-12) d'un any, com a número. */
export function ultimDiaDeMes(any: number, mes: number): number {
  return new Date(Date.UTC(any, mes, 0)).getUTCDate();
}

/**
 * El mateix dia, `n` mesos enrere. Si el mes de destí és més curt, es queda a
 * l'últim dia: el 31 de març menys un mes és el 28 de febrer, no el 3 de març.
 */
export function mesEnrere(dia: string, n = 1): string {
  const [y, m, d] = dia.split('-').map(Number);
  if (!y || !m || !d) return dia;
  const total = (y * 12 + (m - 1)) - n;
  const anyNou = Math.floor(total / 12);
  const mesNou = (total % 12) + 1;
  const diaNou = Math.min(d, ultimDiaDeMes(anyNou, mesNou));
  return `${anyNou}-${String(mesNou).padStart(2, '0')}-${String(diaNou).padStart(2, '0')}`;
}

/** Dies que dura un rang, comptant els dos extrems. */
export function duradaDies(desde: string, fins: string): number {
  const a = new Date(`${desde}T00:00:00.000Z`).getTime();
  const b = new Date(`${fins}T00:00:00.000Z`).getTime();
  return Math.round((b - a) / 86400000) + 1;
}

/**
 * Període amb què comparar el que s'està mirant.
 *
 * Fins a un mes de durada, els mateixos dies del mes anterior: comparar l'1–8
 * de setembre amb el 24–31 d'agost agafaria un tros de mes sense cap rebut fix
 * i el percentatge no diria res. A partir d'aquí, el mateix nombre de dies just
 * abans, que sí que és comparable.
 */
export function periodeAnterior(desde: string, fins: string): { desde: string; fins: string } {
  if (duradaDies(desde, fins) <= 31) {
    return { desde: mesEnrere(desde), fins: mesEnrere(fins) };
  }
  const dies = duradaDies(desde, fins);
  const inici = new Date(`${desde}T00:00:00.000Z`);
  const fi = new Date(inici.getTime() - 86400000);
  const ini = new Date(fi.getTime() - (dies - 1) * 86400000);
  return { desde: aDia(ini), fins: aDia(fi) };
}

// ─── Navegador de períodes (mes · trimestre · any, amb fletxes) ──────────────

export type TipusPeriode = 'mes' | 'tri' | 'any';

/** Estat del navegador: un període relatiu a avui (`off` 0 = l'actual) o un rang a mà. */
export type EstatPeriode =
  | { tipus: TipusPeriode; off: number }
  | { tipus: 'per'; desde: string; fins: string };

const MESOS = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
const TRIMESTRES = ['1r', '2n', '3r', '4t'];
const dia = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * Rang i etiqueta d'un període (`off` períodes respecte del d'avui: -1 = l'anterior).
 * El període en curs s'acaba avui (com feien «Aquest mes» / «Aquest any»); els
 * passats van sencers. `avui` en `YYYY-MM-DD`.
 */
export function rangPeriode(
  tipus: TipusPeriode,
  off: number,
  avui: string,
): { desde: string; fins: string; etiqueta: string; any: number; trimestre: number } {
  const [ay, am] = avui.split('-').map(Number) as [number, number];
  let y: number, m0: number, mesos: number, etiqueta: string;
  if (tipus === 'mes') {
    const t = ay * 12 + (am - 1) + off;
    y = Math.floor(t / 12); m0 = t % 12; mesos = 1;
    etiqueta = `${MESOS[m0]} ${y}`;
  } else if (tipus === 'tri') {
    const t = ay * 4 + Math.floor((am - 1) / 3) + off;
    y = Math.floor(t / 4); m0 = (t % 4) * 3; mesos = 3;
    etiqueta = `${TRIMESTRES[m0 / 3]} trimestre ${y}`;
  } else {
    y = ay + off; m0 = 0; mesos = 12;
    etiqueta = String(y);
  }
  const desde = dia(y, m0 + 1, 1);
  const finsT = new Date(Date.UTC(y, m0 + mesos, 0)).toISOString().slice(0, 10);
  const fins = finsT > avui ? avui : finsT;
  return { desde, fins, etiqueta, any: y, trimestre: Math.floor(m0 / 3) + 1 };
}

const MESOS_CURTS = ['gen.', 'febr.', 'març', 'abr.', 'maig', 'juny', 'jul.', 'ag.', 'set.', 'oct.', 'nov.', 'des.'];

/**
 * Període amb què comparar el que mostra el navegador: el període anterior del
 * MATEIX tipus (mes → mes anterior, trimestre → trimestre anterior, any → any
 * anterior). Si el període actual encara no s'ha acabat (s'atura avui), es compara
 * amb els mateixos dies de l'anterior (1–12 d'oct. ↔ 1–12 de set.), perquè un tros
 * de període contra un de sencer no diria res. `null` per a «Personalitzat».
 */
export function periodeComparacio(
  e: EstatPeriode,
  avui: string,
): { desde: string; fins: string; etiqueta: string } | null {
  if (e.tipus === 'per') return null;
  const act = rangPeriode(e.tipus, e.off, avui);
  const ant = rangPeriode(e.tipus, e.off - 1, avui);
  // Últim dia natural del període (sense tallar-lo a avui).
  const fiNatural = (() => {
    const [y, m] = act.desde.split('-').map(Number) as [number, number];
    const mesos = e.tipus === 'mes' ? 1 : e.tipus === 'tri' ? 3 : 12;
    return new Date(Date.UTC(y, m - 1 + mesos, 0)).toISOString().slice(0, 10);
  })();
  const parcial = act.fins < fiNatural;
  const curta =
    e.tipus === 'any'
      ? String(ant.any)
      : e.tipus === 'tri'
        ? `${['1r', '2n', '3r', '4t'][ant.trimestre - 1]} trim.${ant.any !== act.any ? ` ${ant.any}` : ''}`
        : `${MESOS_CURTS[Number(ant.desde.slice(5, 7)) - 1]}${ant.any !== act.any ? ` ${ant.any}` : ''}`;
  if (!parcial) return { desde: ant.desde, fins: ant.fins, etiqueta: curta };
  // Mateixos dies dins del període anterior.
  const dies = duradaDies(act.desde, act.fins);
  const ini = new Date(`${ant.desde}T00:00:00.000Z`);
  let fins = new Date(ini.getTime() + (dies - 1) * 86400000).toISOString().slice(0, 10);
  if (fins > ant.fins) fins = ant.fins;
  return { desde: ant.desde, fins, etiqueta: `${curta}, mateixos dies` };
}

/** Rang de dies d'un estat del navegador. */
export function rangDeEstat(e: EstatPeriode, avui: string): { desde: string; fins: string } {
  if (e.tipus === 'per') return { desde: e.desde, fins: e.fins };
  const r = rangPeriode(e.tipus, e.off, avui);
  return { desde: r.desde, fins: r.fins };
}
