/**
 * Repartiment per mesos d'un pagament ja fet — lògica pura (testejada).
 * Un pagament sense períodes compta sencer al mes que es va cobrar; si l'estada
 * ocupa més d'un mes natural, el Balanç queda desquadrat (tot un mes, res l'altre).
 */

/** Nits de l'estada per mes natural ("2026-10" → 7). Les dates són ISO yyyy-mm-dd. */
export function nitsPerMes(entradaISO: string, sortidaISO: string): { mes: string; nits: number }[] {
  const out: { mes: string; nits: number }[] = [];
  const d = new Date(`${entradaISO.slice(0, 10)}T00:00:00Z`);
  const fi = new Date(`${sortidaISO.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || Number.isNaN(fi.getTime())) return out;
  for (let i = 0; d < fi && i < 3660; i++) {
    const mes = d.toISOString().slice(0, 7);
    const ultim = out[out.length - 1];
    if (ultim && ultim.mes === mes) ultim.nits++;
    else out.push({ mes, nits: 1 });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** L'estada té nits en més d'un mes natural (la sortida no compta: no és nit). */
export function ocupaMesDunMes(entradaISO: string, sortidaISO: string): boolean {
  return nitsPerMes(entradaISO, sortidaISO).length > 1;
}

const MESOS_CURTS = ['gen', 'febr', 'març', 'abr', 'maig', 'juny', 'jul', 'ag', 'set', 'oct', 'nov', 'des'];

/** "oct 7 nits · nov 24 nits" */
export function resumNitsPerMes(entradaISO: string, sortidaISO: string): string {
  return nitsPerMes(entradaISO, sortidaISO)
    .map((m) => `${MESOS_CURTS[Number(m.mes.slice(5, 7)) - 1]} ${m.nits} ${m.nits === 1 ? 'nit' : 'nits'}`)
    .join(' · ');
}

export interface PeriodeCobert {
  dataInici: string; // primera nit (ISO)
  dataFi: string; // última nit (ISO)
  nits: number;
  import: number;
}

/**
 * Quines nits paga un pagament quan l'estada es paga a trossos (p. ex. un cop al
 * mes): els pagaments van cobrint les nits per ordre, des de l'entrada. `pagatAbans`
 * és el que ja cobrien els pagaments anteriors; `totalEstada` el preu de tota
 * l'estada (preu/nit = total / nits). El que passa del final va a l'última nit.
 * Retorna els trossos per mes natural; la suma és exactament `importPagament`.
 */
export function periodesCoberts(
  entradaISO: string,
  sortidaISO: string,
  totalEstada: number,
  pagatAbans: number,
  importPagament: number,
): PeriodeCobert[] {
  const mesos = nitsPerMes(entradaISO, sortidaISO);
  const nitsTotal = mesos.reduce((a, m) => a + m.nits, 0);
  if (nitsTotal <= 0 || totalEstada <= 0 || importPagament <= 0) return [];
  const preuNit = totalEstada / nitsTotal;
  const eps = 1e-9;
  // Nits (fraccionàries) que cobreix: [ini, fi). Si se'n passa, s'enganxa al final.
  let ini = Math.min(Math.max(pagatAbans, 0) / preuNit, nitsTotal - 1);
  let fi = Math.min((Math.max(pagatAbans, 0) + importPagament) / preuNit, nitsTotal);
  if (fi - ini < eps) {
    ini = nitsTotal - 1;
    fi = nitsTotal;
  }
  const dia = (n: number) => {
    const d = new Date(`${entradaISO.slice(0, 10)}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const out: PeriodeCobert[] = [];
  let a = 0;
  let pesTotal = 0;
  const trossos: { ini: number; fi: number }[] = [];
  for (const m of mesos) {
    const b = a + m.nits;
    const x = Math.max(ini, a);
    const y = Math.min(fi, b);
    if (y - x > eps) {
      trossos.push({ ini: x, fi: y });
      pesTotal += y - x;
    }
    a = b;
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  let assignat = 0;
  trossos.forEach((t, i) => {
    const imp = i === trossos.length - 1 ? r2(importPagament - assignat) : r2((importPagament * (t.fi - t.ini)) / pesTotal);
    assignat = r2(assignat + imp);
    const primera = Math.floor(t.ini + eps);
    const ultima = Math.max(primera, Math.ceil(t.fi - eps) - 1);
    out.push({ dataInici: dia(primera), dataFi: dia(ultima), nits: ultima - primera + 1, import: imp });
  });
  return out;
}

/** Mes natural d'una data ISO ("2026-10-28" → "2026-10"). */
export const mesDe = (iso: string) => iso.slice(0, 7);

export interface EfecteMes {
  mes: string; // "2026-10"
  ara: number; // el que aquests pagaments sumen ara en aquest mes
  despres: number; // el que hi sumaran un cop repartits
}

/**
 * Com canvia el Balanç, mes a mes, si es reparteixen aquests pagaments: ara cada
 * un compta sencer al mes del cobrament; després, cada part al seu mes.
 * Només inclou els mesos on canvia alguna cosa.
 */
export function efecteAlBalanc(
  pagaments: { data: string; import: number; proposta: { dataInici: string; import: number }[] }[],
): EfecteMes[] {
  const m = new Map<string, EfecteMes>();
  const get = (mes: string) => m.get(mes) ?? m.set(mes, { mes, ara: 0, despres: 0 }).get(mes)!;
  for (const p of pagaments) {
    get(mesDe(p.data)).ara += p.import;
    for (const x of p.proposta) get(mesDe(x.dataInici)).despres += x.import;
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return [...m.values()]
    .map((e) => ({ mes: e.mes, ara: r2(e.ara), despres: r2(e.despres) }))
    .filter((e) => Math.abs(e.ara - e.despres) >= 0.01)
    .sort((a, b) => a.mes.localeCompare(b.mes));
}
