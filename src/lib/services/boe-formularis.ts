/**
 * Revisa els sumaris del BOE dels últims dies i desa (audit_log, entitat
 * «boe_formulari») cada ordre nova que toqui algun model d'impostos de l'hostal.
 * /impostos les mostra com a avís fins que es marquen com a vistes.
 */
import 'server-only';
import { prisma } from '../db';
import { audit } from '../audit';
import { itemsDelSumari, modelsDelTitol, ORDRES_APLICADES } from '../boe-formularis';

export interface AvisBoe { id: string; titol: string; url: string; models: string[]; data: string }

const yyyymmdd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

export async function revisaBoe(dies = 8, avui = new Date()): Promise<AvisBoe[]> {
  const nous: AvisBoe[] = [];
  for (let i = 0; i < dies; i++) {
    const d = new Date(avui);
    d.setDate(d.getDate() - i);
    const res = await fetch(`https://www.boe.es/datosabiertos/api/boe/sumario/${yyyymmdd(d)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) continue; // diumenges i festius no hi ha BOE (404)
    const items = itemsDelSumari(await res.json().catch(() => null));
    for (const it of items) {
      const models = modelsDelTitol(it.titol);
      if (models.length === 0 || ORDRES_APLICADES[it.id]) continue;
      const ja = await prisma.auditLog.findFirst({ where: { entitat: 'boe_formulari', entitatId: it.id }, select: { id: true } });
      if (ja) continue;
      const avis = { ...it, models, data: d.toISOString().slice(0, 10) };
      await audit({ usuariId: null, accio: 'CREACIO', entitat: 'boe_formulari', entitatId: it.id, detall: { ...avis } });
      nous.push(avis);
    }
  }
  return nous;
}

/** Avisos del BOE pendents de revisar (els no descartats). */
export async function avisosBoePendents(): Promise<AvisBoe[]> {
  const [logs, descartats] = await Promise.all([
    prisma.auditLog.findMany({ where: { entitat: 'boe_formulari' }, orderBy: { createdAt: 'desc' }, take: 50, select: { detall: true } }),
    prisma.avisDescartat.findMany({ where: { tipus: 'BOE_FORMULARI' }, select: { entitatId: true } }),
  ]);
  const vistos = new Set(descartats.map((x) => x.entitatId));
  return logs
    .map((l) => l.detall as unknown as AvisBoe)
    .filter((a) => a && typeof a.id === 'string' && !vistos.has(a.id));
}
