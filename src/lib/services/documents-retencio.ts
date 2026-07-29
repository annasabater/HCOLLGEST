import { prisma } from '@/lib/db';
import { deleteUpload } from '@/lib/storage';

/**
 * Retenció de documents d'identitat (DNI/passaport/NIE): la imatge NO es pot
 * conservar indefinidament (RGPD, principi de limitació del termini). Passat el
 * termini de conservació, la imatge s'esborra FÍSICAMENT (fitxer xifrat) i el
 * registre queda marcat com a purgat. Les DADES del registre de viatgers es
 * conserven a part (3 anys) segons el RD 933/2021; això només afecta la imatge.
 *
 * El termini per defecte és 3 anys (coincidint amb el registre de viatgers).
 * Es pot ajustar amb DOCUMENT_RETENTION_YEARS si la DPO fixa un altre número.
 */
export function getRetentionYears(): number {
  const raw = Number(process.env.DOCUMENT_RETENTION_YEARS);
  return Number.isFinite(raw) && raw > 0 ? raw : 3;
}

export interface PurgaResult {
  anys: number;
  tallada: string; // data límit ISO
  esborrats: number;
  errors: number;
}

/**
 * Esborra les imatges de documents d'identitat més antigues que el termini de
 * retenció. Idempotent: els que ja s'han purgat no es tornen a tractar (es
 * detecten perquè ja no tenen fitxer associat / estan marcats amb deletedAt).
 */
export async function purgarDocumentsVencuts(): Promise<PurgaResult> {
  const anys = getRetentionYears();
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
