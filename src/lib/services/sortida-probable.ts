import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { toISODate } from '@/lib/dates';
import { finalitzarEstanciaAnticipada } from '@/lib/services/factura';

/**
 * «Marxarà abans»: l'hoste ha dit que probablement marxarà un dia abans de la
 * sortida oficial. No es cancel·la res ni es toca el que ha pagat; la sortida
 * oficial (Mossos, factura) es queda igual. Només fa que, des d'aquell dia,
 * l'habitació surti «probablement lliure» (calendari, avís de solapament, neteja)
 * i que no es proposi preguntar la pròrroga. Quan marxa de debò, «Ha marxat» fa la
 * sortida anticipada amb aquesta data; «Al final es queda» ho treu.
 */
export async function marcaSortidaProbable(
  estanciaId: string,
  input: { data: string; nota?: string | null },
  actor: { id: string } | null,
  ip: string | null,
) {
  const est = await prisma.estancia.findFirst({
    where: { id: estanciaId, deletedAt: null },
    select: { id: true, estat: true, dataEntrada: true, dataSortida: true, sortidaAnticipada: true },
  });
  if (!est) throw new Error('Estada no trobada');
  if (est.estat === 'CANCELLADA' || est.sortidaAnticipada) throw new Error('Aquesta estada ja no és en curs');
  if (!est.dataEntrada || !est.dataSortida) throw new Error("L'estada ha de tenir entrada i sortida");
  const dia = input.data;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new Error('Data no vàlida');
  if (dia <= toISODate(est.dataEntrada)) throw new Error("La sortida probable ha de ser després de l'entrada");
  if (dia >= toISODate(est.dataSortida)) throw new Error('La sortida probable ha de ser abans de la sortida oficial');
  const nota = input.nota?.trim() || null;

  await prisma.estancia.update({
    where: { id: estanciaId },
    data: { sortidaProbable: new Date(dia), sortidaProbableNota: nota },
  });
  await audit({
    usuariId: actor?.id ?? null,
    accio: 'MODIFICACIO',
    entitat: 'estancia',
    entitatId: estanciaId,
    detall: { sortidaProbable: dia, nota },
    ip,
  });
  return { ok: true };
}

/** «Al final es queda»: treu la sortida probable. */
export async function treuSortidaProbable(estanciaId: string, actor: { id: string } | null, ip: string | null) {
  await prisma.estancia.update({
    where: { id: estanciaId },
    data: { sortidaProbable: null, sortidaProbableNota: null },
  });
  await audit({
    usuariId: actor?.id ?? null,
    accio: 'MODIFICACIO',
    entitat: 'estancia',
    entitatId: estanciaId,
    detall: { sortidaProbable: null },
    ip,
  });
  return { ok: true };
}

/**
 * Quan entra algú a una habitació (estada EN_CURS que ja ha començat), les
 * estades d'aquella habitació que havien de marxar «probablement» abans o el
 * mateix dia es donen per marxades (sortida anticipada el dia probable, sense
 * retorn). Així, encara que no s'hagi premut «Ha marxat», no queda penjat.
 * Retorna els noms per poder-ho dir a l'usuari.
 */
export async function tancaProbablesEnEntrar(
  novaId: string,
  actor: { id: string } | null,
  ip: string | null,
): Promise<string[]> {
  const nova = await prisma.estancia.findFirst({
    where: { id: novaId, deletedAt: null },
    select: { habitacioId: true, dataEntrada: true, estat: true },
  });
  if (!nova?.habitacioId || !nova.dataEntrada || nova.estat === 'CANCELLADA' || nova.estat === 'RESERVA') return [];
  const entrada = toISODate(nova.dataEntrada);
  if (entrada > toISODate(new Date())) return []; // encara no ha entrat
  const anteriors = await prisma.estancia.findMany({
    where: {
      id: { not: novaId },
      deletedAt: null,
      habitacioId: nova.habitacioId,
      estat: { not: 'CANCELLADA' },
      sortidaAnticipada: false,
      sortidaProbable: { not: null, lte: new Date(`${entrada}T23:59:59Z`) },
      dataSortida: { gt: nova.dataEntrada },
    },
    select: {
      id: true,
      sortidaProbable: true,
      viatgers: { where: { esTitular: true }, take: 1, select: { huesped: { select: { nom: true, cognom1: true } } } },
    },
  });
  const noms: string[] = [];
  for (const a of anteriors) {
    await finalitzarEstanciaAnticipada(a.id, { dataSortida: toISODate(a.sortidaProbable!), retorn: false }, actor, ip);
    const h = a.viatgers[0]?.huesped;
    noms.push(h ? `${h.nom} ${h.cognom1}` : 'l’hoste anterior');
  }
  return noms;
}
