import { prisma } from '@/lib/db';
import { deleteUpload } from '@/lib/storage';

/**
 * Retenció de documents d'identitat (DNI/passaport/NIE).
 *
 * El termini es controla amb DOCUMENT_RETENTION_YEARS:
 *   - un número > 0  → passat aquest nombre d'anys, la imatge s'esborra
 *     FÍSICAMENT (fitxer xifrat) i el registre queda marcat com a purgat.
 *   - buit / "off" / "never" / "0"  → esborrat automàtic DESACTIVAT: la imatge
 *     es conserva fins a esborrat MANUAL (decisió del responsable del tractament).
 *
 * ⚠ Nota legal: conservar imatges de document d'identitat de forma indefinida
 *   és difícil de justificar davant el RGPD (limitació del termini). Aquesta
 *   configuració és decisió del responsable, informat del risc. Les DADES del
 *   registre de viatgers es conserven a part (RD 933/2021); això només és la imatge.
 */
export function getRetentionYears(): number | null {
  const raw = (process.env.DOCUMENT_RETENTION_YEARS ?? '').trim().toLowerCase();
  if (raw === '' || raw === 'off' || raw === 'never' || raw === '0') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export interface PurgaResult {
  anys: number | null;
  tallada: string | null; // data límit ISO (null si està desactivat)
  esborrats: number;
  errors: number;
  desactivat?: boolean;
}

/**
 * Esborra les imatges de documents d'identitat més antigues que el termini de
 * retenció. Si l'esborrat automàtic està desactivat, no fa res. Idempotent.
 */
export async function purgarDocumentsVencuts(): Promise<PurgaResult> {
  const anys = getRetentionYears();
  if (anys == null) {
    // Esborrat automàtic desactivat: es conserva fins a esborrat manual.
    return { anys: null, tallada: null, esborrats: 0, errors: 0, desactivat: true };
  }
  const tallada = new Date();
  tallada.setFullYear(tallada.getFullYear() - anys);

  // Documents encara vigents (amb fitxer) més antics que el termini.
  const vencuts = await prisma.documentoPujat.findMany({
    where: { dataSubida: { lt: tallada }, deletedAt: null },
    select: { id: true, fitxerPath: true },
  });

  let esborrats = 0;
  let errors = 0;
  for (const doc of vencuts) {
    try {
      await deleteUpload(doc.fitxerPath); // esborra el fitxer xifrat de veritat
      await prisma.documentoPujat.update({
        where: { id: doc.id },
        data: { deletedAt: new Date() }, // marca'l com a purgat (ja no es pot servir)
      });
      esborrats++;
    } catch {
      errors++;
    }
  }

  return { anys, tallada: tallada.toISOString(), esborrats, errors };
}
