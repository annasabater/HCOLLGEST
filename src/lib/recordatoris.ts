/**
 * Recordatoris propis (assegurança, revisions, contractes…): lògica pura de dates.
 * Les dates són dies "YYYY-MM-DD" en hora de Madrid (no instants).
 */

export const TIPUS_RECORDATORI = ['ASSEGURANCA', 'REVISIO', 'CONTRACTE', 'IMPOSTOS', 'ALTRES'] as const;
export type TipusRecordatori = (typeof TIPUS_RECORDATORI)[number];
export const TIPUS_RECORDATORI_LABELS: Record<TipusRecordatori, string> = {
  ASSEGURANCA: 'Assegurança',
  REVISIO: 'Revisió',
  CONTRACTE: 'Contracte',
  IMPOSTOS: 'Impostos',
  ALTRES: 'Altres',
};

export const UNITATS_REPETICIO = ['SETMANES', 'MESOS', 'ANYS'] as const;
export type UnitatRepeticio = (typeof UNITATS_REPETICIO)[number];

/** Dies d'avís que es proposen al formulari. */
export const DIES_ABANS_PROPOSATS = [30, 15, 7, 1, 0] as const;

/** Dia d'avui (o de `now`) a Madrid, "YYYY-MM-DD". */
export function diaMadrid(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Hora (0–23) a Madrid. */
export function horaMadrid(now: Date = new Date()): number {
  const h = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hourCycle: 'h23' }).format(now);
  return Number(h);
}

const utc = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Dies de `a` a `b` (positiu si `b` és després). */
export function diesEntre(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

export function sumaDies(dia: string, n: number): string {
  return iso(utc(dia) + n * 86_400_000);
}

/** Suma mesos sense saltar de mes: 31/01 + 1 mes = 28/02 (o 29). */
function sumaMesos(dia: string, n: number): string {
  const y = Number(dia.slice(0, 4));
  const m = Number(dia.slice(5, 7)) - 1;
  const d = Number(dia.slice(8, 10));
  const t = y * 12 + m + n;
  const ny = Math.floor(t / 12);
  const nm = t - ny * 12;
  const ultim = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return iso(Date.UTC(ny, nm, Math.min(d, ultim)));
}

/** Data de la propera vegada d'un recordatori que es repeteix. */
export function seguentData(dia: string, cada: number, unitat: UnitatRepeticio): string {
  const n = Math.max(1, Math.floor(cada));
  if (unitat === 'SETMANES') return sumaDies(dia, 7 * n);
  if (unitat === 'MESOS') return sumaMesos(dia, n);
  return sumaMesos(dia, 12 * n);
}

export interface RecordatoriDates {
  data: string; // YYYY-MM-DD
  diesAbans: number[];
  whatsapp: boolean;
  ajornatFins: string | null;
  fet: boolean;
}

/** Primer dia en què surt al tauler (el "dies abans" més gran). */
export function primerAvis(r: Pick<RecordatoriDates, 'data' | 'diesAbans'>): string {
  const max = Math.max(0, ...r.diesAbans.filter((n) => Number.isFinite(n) && n >= 0));
  return sumaDies(r.data, -max);
}

/** Surt a «Ara toca» del tauler: ja ha arribat el primer avís, no és fet i no està ajornat. */
export function tocaAra(r: RecordatoriDates, avui: string): boolean {
  if (r.fet) return false;
  if (r.ajornatFins && avui < r.ajornatFins) return false;
  return avui >= primerAvis(r);
}

/**
 * S'envia per WhatsApp avui: un dels dies d'avís, el mateix dia, el dia que acaba
 * un ajornament, i un cop per setmana mentre estigui vençut sense marcar Fet.
 */
export function tocaWhatsapp(r: RecordatoriDates, avui: string): boolean {
  if (r.fet || !r.whatsapp) return false;
  if (r.ajornatFins) {
    if (avui < r.ajornatFins) return false;
    if (avui === r.ajornatFins) return true;
  }
  const dies = diesEntre(avui, r.data);
  if (dies === 0 || r.diesAbans.includes(dies)) return true;
  if (dies < 0) {
    // Vençut: setmanalment, comptant des del dia (o des del final de l'ajornament).
    const des = r.ajornatFins && r.ajornatFins > r.data ? r.ajornatFins : r.data;
    const passats = diesEntre(des, avui);
    return passats > 0 && passats % 7 === 0;
  }
  return false;
}

/** "avui", "demà", "d'aquí a 7 dies", "ahir", "fa 3 dies". */
export function textQuan(dies: number): string {
  if (dies === 0) return 'avui';
  if (dies === 1) return 'demà';
  if (dies === -1) return 'ahir';
  return dies > 0 ? `d’aquí a ${dies} dies` : `fa ${-dies} dies`;
}

/** Text de la repetició: «Un sol cop», «Cada any», «Cada 3 mesos»… */
export function textRepeticio(cada: number | null | undefined, unitat: string | null | undefined): string {
  if (!cada || !unitat) return 'Un sol cop';
  const u = unitat as UnitatRepeticio;
  if (cada === 1) return u === 'SETMANES' ? 'Cada setmana' : u === 'MESOS' ? 'Cada mes' : 'Cada any';
  return `Cada ${cada} ${u === 'SETMANES' ? 'setmanes' : u === 'MESOS' ? 'mesos' : 'anys'}`;
}

/** Text dels dies d'avís: «30 i 7 dies abans», «el mateix dia». */
export function textDiesAbans(dies: number[]): string {
  const ord = [...new Set(dies)].sort((a, b) => b - a);
  if (ord.length === 0) return 'el mateix dia';
  const parts = ord.map((d) => (d === 0 ? 'el mateix dia' : String(d)));
  const nums = ord.filter((d) => d > 0);
  const base = nums.length === 0 ? '' : `${nums.join(', ').replace(/, (\d+)$/, ' i $1')} ${nums.length === 1 && nums[0] === 1 ? 'dia' : 'dies'} abans`;
  return ord.includes(0) ? (base ? `${base} i el mateix dia` : parts[0]!) : base;
}

/** "15/12/2026" */
export function dataCurta(dia: string): string {
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
}

// ─── Resum diari per WhatsApp ────────────────────────────────────────────────

export interface ResumDiari {
  dia: string;
  recordatoris: { titol: string; data: string; notes: string | null }[];
  cobraments: { titular: string; import: number; data: string; concepte: string | null }[];
  sortides: { titular: string; habitacio: string | null; data: string }[];
  opinions: { autor: string; puntuacio: number; tipus: 'GOOGLE' | 'VALORACIO' }[];
}

export const resumBuit = (r: ResumDiari) =>
  r.recordatoris.length + r.cobraments.length + r.sortides.length + r.opinions.length === 0;

const eur = (n: number) =>
  `${n.toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;

/** Notificació curta del resum: títol i 4 línies com a molt. */
export function notificacioResum(r: ResumDiari): { title: string; body: string } {
  const n = r.recordatoris.length + r.cobraments.length + r.sortides.length + r.opinions.length;
  const quan = (d: string) => textQuan(diesEntre(r.dia, d));
  const linies = [
    ...r.sortides.map((s) => `Sortida: ${s.titular}${s.habitacio ? ` (hab. ${s.habitacio})` : ''} ${quan(s.data)}`),
    ...r.cobraments.map((c) => `Cobrament: ${c.titular} · ${eur(c.import)} ${quan(c.data)}`),
    ...r.recordatoris.map((x) => `Recordatori: ${x.titol} (${quan(x.data)})`),
    ...r.opinions.map((o) => `Opinió nova: ${o.autor} · ${o.puntuacio}/5`),
  ];
  const body = linies.length > 4 ? [...linies.slice(0, 3), `i ${linies.length - 3} més…`] : linies;
  return { title: `Bon dia: ${n === 1 ? '1 cosa' : `${n} coses`} per avui`, body: body.join('\n') };
}

/** Missatge de WhatsApp (format de WhatsApp: *negreta*). */
export function textResum(r: ResumDiari, urlBase: string): string {
  const l: string[] = [`*Hostal Coll · ${dataCurta(r.dia)}*`];
  const quan = (d: string) => textQuan(diesEntre(r.dia, d));
  if (r.recordatoris.length) {
    l.push('', '*Recordatoris*');
    for (const x of r.recordatoris) {
      const dies = diesEntre(r.dia, x.data);
      const verb = dies < 0 ? 'Era' : 'És';
      l.push(`• ${x.titol} — ${verb} el ${dataCurta(x.data)} (${quan(x.data)})${x.notes ? `\n  ${x.notes}` : ''}`);
    }
  }
  if (r.sortides.length) {
    l.push('', '*Sortides*');
    for (const s of r.sortides) l.push(`• ${s.titular}${s.habitacio ? ` (hab. ${s.habitacio})` : ''} — surt ${quan(s.data)}`);
  }
  if (r.cobraments.length) {
    l.push('', '*Cobraments a punt*');
    for (const c of r.cobraments) l.push(`• ${c.titular} · ${eur(c.import)} — paga ${quan(c.data)}${c.concepte ? ` · ${c.concepte}` : ''}`);
  }
  if (r.opinions.length) {
    l.push('', '*Opinions noves*');
    for (const o of r.opinions) l.push(`• ${o.autor} · ${o.puntuacio}/5${o.tipus === 'GOOGLE' ? ' (Google)' : ' (valoració)'}`);
  }
  l.push('', `${urlBase.replace(/\/$/, '')}/recordatoris`);
  return l.join('\n');
}
