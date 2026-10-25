import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { ok, handleApiError } from '@/lib/http';
import { DIES_EDICIO } from '@/lib/validation/tarifa-tipus';

// GET /api/tarifes-tipus/versions — historial de la matriu de tarifes, de la més
// nova a la més antiga (cada una vigent des de `desDe` fins a la següent).
export async function GET() {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const versions = await prisma.tarifaTipusVersio.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    const ids = [...new Set(versions.map((v) => v.usuariId).filter((id): id is string => !!id))];
    const usuaris = await prisma.usuari.findMany({ where: { id: { in: ids } }, select: { id: true, nom: true } });
    const nom = new Map(usuaris.map((u) => [u.id, u.nom]));
    return ok({
      versions: versions.map((v, i) => ({
        id: v.id,
        desDe: v.createdAt.toISOString(),
        editadaEl: v.editadaEl?.toISOString() ?? null,
        // Només la més nova, si s'ha fet des de la pantalla, pot estar encara en edició.
        obertaFins: i === 0 && v.usuariId
          ? new Date(v.createdAt.getTime() + DIES_EDICIO * 86_400_000).toISOString()
          : null,
        usuari: v.usuariId ? nom.get(v.usuariId) ?? null : null,
        files: v.files,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
