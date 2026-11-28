/**
 * «M'ha de pagar» (recordatori d'estada amb import) i «Cobrament pendent»
 * (PagamentPrevist) són LA MATEIXA COSA: s'apunta una sola vegada, per on sigui,
 * i l'altre es crea, s'edita, es paga i s'esborra sol.
 *
 * - Recordatori → cobrament: en desar un «M'ha de pagar» amb import es crea (o
 *   s'actualitza) el cobrament pendent del contracte; si deixa de ser-ho o s'esborra,
 *   el cobrament (si no s'ha pagat) també. «Fet» = pagat.
 * - Cobrament → recordatori: «+ Cobrament pendent» crea el recordatori; editar-lo,
 *   pagar-lo o esborrar-lo fa el mateix al recordatori.
 *
 * Totes les funcions treballen dins la transacció de qui les crida; la
 * sincronització amb el Google Calendar la fa qui crida, després.
 */
import 'server-only';
import type { PagamentPrevist, Prisma, Recordatori } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/** Data del cobrament → dia del recordatori (mitjanit UTC, com la resta). */
const diaDe = (d: Date) => new Date(`${d.toISOString().slice(0, 10)}T00:00:00Z`);

/**
 * Després de crear, editar o esborrar un recordatori: deixa el cobrament pendent
 * d'acord amb ell. Un cobrament ja pagat no es toca mai.
 */
export async function cobramentDesDeRecordatori(tx: Tx, r: Recordatori): Promise<void> {
  const vol =
    !r.deletedAt && r.accio === 'COBRAMENT' && !!r.estanciaId && r.import != null && Number(r.import) > 0;
  const pp = r.pagamentPrevistId ? await tx.pagamentPrevist.findUnique({ where: { id: r.pagamentPrevistId } }) : null;
  if (vol) {
    const dades = { estanciaId: r.estanciaId!, import: r.import!, dataPrevista: r.data, concepte: r.titol };
    if (pp) {
      if (!pp.pagat) await tx.pagamentPrevist.update({ where: { id: pp.id }, data: dades });
    } else {
      const nou = await tx.pagamentPrevist.create({ data: { ...dades, pagat: !!r.fetAt, dataPagament: r.fetAt } });
      await tx.recordatori.update({ where: { id: r.id }, data: { pagamentPrevistId: nou.id } });
    }
  } else if (pp) {
    await tx.recordatori.update({ where: { id: r.id }, data: { pagamentPrevistId: null } });
    if (!pp.pagat) await tx.pagamentPrevist.delete({ where: { id: pp.id } });
  }
}

/** «Fet» (o desfer-lo) en un «M'ha de pagar»: el cobrament queda pagat (o no). */
export async function cobramentPagatDesDeRecordatori(tx: Tx, r: Recordatori, pagat: boolean): Promise<void> {
  if (!r.pagamentPrevistId) return;
  await tx.pagamentPrevist.updateMany({
    where: { id: r.pagamentPrevistId },
    data: { pagat, dataPagament: pagat ? new Date() : null },
  });
}

/** «+ Cobrament pendent»: crea el recordatori «M'ha de pagar» que hi va lligat. Retorna el seu id. */
export async function recordatoriPerCobramentNou(tx: Tx, pp: PagamentPrevist): Promise<string> {
  const r = await tx.recordatori.create({
    data: {
      titol: pp.concepte?.trim() || 'Cobro',
      tipus: 'ALTRES',
      data: diaDe(pp.dataPrevista),
      diesAbans: [1, 0],
      whatsapp: true,
      calendari: true,
      estanciaId: pp.estanciaId,
      accio: 'COBRAMENT',
      import: pp.import,
      pagamentPrevistId: pp.id,
      fetAt: pp.pagat ? (pp.dataPagament ?? new Date()) : null,
    },
  });
  return r.id;
}

/**
 * Després d'editar o pagar un cobrament pendent: el recordatori lligat fa el mateix
 * (import, dia, concepte i «Fet» si s'ha pagat). Retorna l'id del recordatori tocat.
 */
export async function recordatoriDesDeCobrament(tx: Tx, pp: PagamentPrevist): Promise<string | null> {
  const r = await tx.recordatori.findUnique({ where: { pagamentPrevistId: pp.id } });
  if (!r || r.deletedAt) return null;
  const canviaDia = r.data.getTime() !== diaDe(pp.dataPrevista).getTime();
  await tx.recordatori.update({
    where: { id: r.id },
    data: {
      import: pp.import,
      data: diaDe(pp.dataPrevista),
      ...(pp.concepte?.trim() ? { titol: pp.concepte.trim() } : {}),
      ...(canviaDia ? { ajornatFins: null, avisatDia: null } : {}),
      fetAt: pp.pagat ? (r.fetAt ?? pp.dataPagament ?? new Date()) : null,
    },
  });
  return r.id;
}

/** Abans d'esborrar un cobrament pendent: el seu recordatori també s'esborra. Retorna l'id. */
export async function recordatoriEnEsborrarCobrament(tx: Tx, ppId: string): Promise<string | null> {
  const r = await tx.recordatori.findUnique({ where: { pagamentPrevistId: ppId } });
  if (!r || r.deletedAt) return null;
  await tx.recordatori.update({ where: { id: r.id }, data: { deletedAt: new Date(), pagamentPrevistId: null } });
  return r.id;
}
