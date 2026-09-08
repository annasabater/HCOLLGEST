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
