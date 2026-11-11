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

/** Mes natural d'una data ISO ("2026-10-28" → "2026-10"). */
export const mesDe = (iso: string) => iso.slice(0, 7);
