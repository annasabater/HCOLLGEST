import 'server-only';
import { prisma } from '../db';
import type { Signatura } from '@prisma/client';

/**
 * Firmes de l'estada ORIGEN, indexades per huespedId. Serveix perquè una
 * AMPLIACIÓ reaprofiti la firma que els hostes ja van fer a l'estada original
 * (no cal tornar-los a demanar que signin).
 */
export async function firmesDeLOrigen(estanciaOrigenId: string | null): Promise<Map<string, Signatura>> {
  const map = new Map<string, Signatura>();
  if (!estanciaOrigenId) return map;
  const viatgers = await prisma.estanciaViatger.findMany({
    where: { estanciaId: estanciaOrigenId },
    include: { signatura: true },
  });
  for (const v of viatgers) if (v.signatura) map.set(v.huespedId, v.signatura);
  return map;
}

/**
 * Cada viatger SENSE firma pròpia hereta la de l'estada origen (mateix hoste).
 * Els que ja tenen firma no es toquen.
 */
export function ambFirmaHeretada<T extends { huespedId: string; signatura: Signatura | null }>(
  viatgers: T[],
  firmesOrigen: Map<string, Signatura>,
): T[] {
  if (firmesOrigen.size === 0) return viatgers;
  return viatgers.map((v) => (v.signatura ? v : { ...v, signatura: firmesOrigen.get(v.huespedId) ?? null }));
}
