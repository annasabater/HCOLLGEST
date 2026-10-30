/**
 * Tram d'una estada (principal + ampliacions) on cau una data: el primer amb
 * entrada ≤ dia < sortida (el dia de canvi de tram ja és del tram nou). Si la
 * data és posterior a tots, l'últim; si és anterior a tots, el primer. Es
 * compara per dia (sense hora). Retorna null si no hi ha trams.
 */
export interface TramDates {
  id: string;
  dataEntrada: Date | null;
  dataSortida: Date | null;
}

const dia = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

export function tramPerData<T extends TramDates>(trams: T[], data: Date): T | null {
  const ordenats = trams
    .filter((t) => t.dataEntrada)
    .sort((a, b) => a.dataEntrada!.getTime() - b.dataEntrada!.getTime());
  if (ordenats.length === 0) return null;
  const x = dia(data);
  const dins = ordenats.find(
    (t) => dia(t.dataEntrada!) <= x && (!t.dataSortida || x < dia(t.dataSortida)),
  );
  if (dins) return dins;
  return x < dia(ordenats[0]!.dataEntrada!) ? ordenats[0]! : ordenats[ordenats.length - 1]!;
}
