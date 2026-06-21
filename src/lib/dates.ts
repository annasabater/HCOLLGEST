/** Utilidades de fecha/edad (sin dependencias de servidor). */

/** Edad en años cumplidos en una fecha de referencia. */
export function ageAt(birth: Date, ref: Date): number {
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
  return age;
}

/** §2.3: "menor" = menor de 14 años en la fecha de referencia (entrada). */
export function isMenor(birth: Date | null | undefined, ref: Date): boolean {
  if (!birth) return false;
  return ageAt(birth, ref) < 14;
}

/** Inicio del día de hoy (para comparaciones "<= hoy"). */
export function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Número de noches entre dos fechas (>= 0). */
export function nights(entrada: Date, sortida: Date): number {
  const ms = sortida.getTime() - entrada.getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

/** Fecha en formato ISO local 'YYYY-MM-DD'. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Lunes (00:00) de la semana que contiene `d`. */
export function startOfWeekMonday(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const day = (r.getDay() + 6) % 7; // 0 = lunes
  r.setDate(r.getDate() - day);
  return r;
}

/** Los 7 días (lunes→domingo) de la semana que contiene `d`. */
export function weekDays(d: Date): Date[] {
  const start = startOfWeekMonday(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
