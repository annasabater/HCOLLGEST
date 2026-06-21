/**
 * Veri*Factu — generació de la HUELLA (hash) encadenada del registre d'alta,
 * segons l'algorisme de l'AEAT (Ordre HAC/1177/2024).
 *
 * Cadena (claus en aquest ordre exacte, unides per "&"):
 *   IDEmisorFactura, NumSerieFactura, FechaExpedicionFactura, TipoFactura,
 *   CuotaTotal, ImporteTotal, Huella (anterior), FechaHoraHusoGenRegistro
 * → SHA-256 → hexadecimal en MAJÚSCULES.
 */
import { createHash } from 'node:crypto';

export interface HuellaFields {
  idEmisor: string;
  numSerie: string;
  fechaExpedicion: string; // dd-mm-aaaa
  tipoFactura: string; // F1, F2, …
  cuotaTotal: string; // import formatat (p.ex. "12.35")
  importeTotal: string;
  huellaAnterior: string; // '' si és el primer registre
  fechaHoraHuso: string; // ISO 8601 amb offset
}

/** Import en format AEAT: 2 decimals, punt decimal, sense separador de milers. */
export function formatImporte(n: number): string {
  return n.toFixed(2);
}

function madridParts(d: Date): Record<string, string> {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  return Object.fromEntries(dtf.formatToParts(d).map((p) => [p.type, p.value]));
}

/** Data d'expedició en format dd-mm-aaaa (zona Europe/Madrid). */
export function formatFechaExpedicion(d: Date): string {
  const p = madridParts(d);
  return `${p.day}-${p.month}-${p.year}`;
}

/** FechaHoraHusoGenRegistro: ISO 8601 amb offset d'Europe/Madrid. */
export function formatFechaHoraHuso(d: Date): string {
  const p = madridParts(d);
  const asUTC = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  const offsetMin = Math.round((asUTC - d.getTime()) / 60000);
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, '0');
  const om = String(abs % 60).padStart(2, '0');
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${sign}${oh}:${om}`;
}

/** Construeix la cadena exacta que es passa a SHA-256 (útil per auditar). */
export function buildHuellaString(f: HuellaFields): string {
  return [
    `IDEmisorFactura=${f.idEmisor}`,
    `NumSerieFactura=${f.numSerie}`,
    `FechaExpedicionFactura=${f.fechaExpedicion}`,
    `TipoFactura=${f.tipoFactura}`,
    `CuotaTotal=${f.cuotaTotal}`,
    `ImporteTotal=${f.importeTotal}`,
    `Huella=${f.huellaAnterior}`,
    `FechaHoraHusoGenRegistro=${f.fechaHoraHuso}`,
  ].join('&');
}

/** Huella SHA-256 (hex MAJÚSCULES) del registre d'alta. */
export function computeHuellaAlta(f: HuellaFields): string {
  return createHash('sha256').update(buildHuellaString(f), 'utf8').digest('hex').toUpperCase();
}
