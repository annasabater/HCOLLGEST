import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, ok } from '@/lib/http';
import { NORMES_PER_DEFECTE, normesDe, versionsNormes, type VersioNormes } from '@/lib/pdf/reglament';

const ESTABLIMENT_ID = 'hostal-coll';
/** Versions que es guarden (les antigues serveixen per als reglaments ja signats). */
const MAX_VERSIONS = 200;

async function carrega() {
  return prisma.establiment.findUniqueOrThrow({ where: { id: ESTABLIMENT_ID }, select: { normesReglament: true } });
}

/** Afegeix una versió nova vigent des d'ara (no esborra les anteriors). */
async function desaVersio(normes: string[]): Promise<VersioNormes[]> {
  const versions = [...versionsNormes(await carrega()), { desDe: new Date().toISOString(), normes }].slice(-MAX_VERSIONS);
  await prisma.establiment.update({
    where: { id: ESTABLIMENT_ID },
    data: { normesReglament: { versions: versions.map((v) => ({ desDe: v.desDe, normes: v.normes })) } as Prisma.InputJsonObject },
  });
  return versions;
}

// GET /api/establiment/normes — normes de la casa d'ara (reglament i cartell).
export async function GET() {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const e = await carrega();
    const versions = versionsNormes(e);
    return ok({
      normes: normesDe(e),
      perDefecte: versions.length === 0,
      ultimaEdicio: versions[versions.length - 1]?.desDe ?? null,
      normesPerDefecte: NORMES_PER_DEFECTE,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const PutSchema = z.object({
  normes: z
    .array(z.string().trim().min(1, 'Una norma no pot quedar buida').max(1500, 'Una norma és massa llarga'))
    .min(1, 'Hi ha d’haver almenys una norma')
    .max(60, 'Massa normes'),
});

// PUT /api/establiment/normes { normes } — desa les normes editades (nova versió).
export async function PUT(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { normes } = PutSchema.parse(await req.json().catch(() => null));
    const versions = await desaVersio(normes);
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'establiment', entitatId: ESTABLIMENT_ID, detall: { camp: 'normesReglament', normes: normes.length, versio: versions.length }, ip: clientIp(req) });
    return ok({ normes, perDefecte: false, ultimaEdicio: versions[versions.length - 1]!.desDe });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/establiment/normes — torna a les normes per defecte (també com a versió nova).
export async function DELETE(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const versions = await desaVersio(NORMES_PER_DEFECTE);
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'establiment', entitatId: ESTABLIMENT_ID, detall: { camp: 'normesReglament', accio: 'restaura per defecte', versio: versions.length }, ip: clientIp(req) });
    return ok({ normes: NORMES_PER_DEFECTE, perDefecte: false, ultimaEdicio: versions[versions.length - 1]!.desDe });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
