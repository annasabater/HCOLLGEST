import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ALL, ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, ok, handleApiError } from '@/lib/http';
import { AvisCreateSchema } from '@/lib/validation/avis';

// GET /api/avisos?q=&actiu= — llista d'avisos interns
export async function GET(req: Request) {
  try {
    const auth = await authorize(ROLES_ALL);
    if (auth instanceof Response) return auth;

    const sp = new URL(req.url).searchParams;
    const q = sp.get('q')?.trim();
    const actiu = sp.get('actiu');

    const avisos = await prisma.avis.findMany({
      where: {
        ...(actiu === 'true' ? { actiu: true } : actiu === 'false' ? { actiu: false } : {}),
        ...(q
          ? {
              OR: [
                { nom: { contains: q, mode: 'insensitive' } },
                { telefon: { contains: q, mode: 'insensitive' } },
                { motiu: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ actiu: 'desc' }, { createdAt: 'desc' }],
    });
    return ok({ avisos });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/avisos — crea un avís intern
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;

    const body = await req.json().catch(() => null);
    const data = AvisCreateSchema.parse(body);

    const avis = await prisma.avis.create({
      data: {
        nom: data.nom,
        telefon: data.telefon ?? null,
        email: data.email ?? null,
        motiu: data.motiu,
        gravetat: data.gravetat,
        notes: data.notes ?? null,
        usuariId: auth.id,
      },
    });
    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'avis',
      entitatId: avis.id,
      detall: { nom: data.nom },
      ip: clientIp(req),
    });
    return created({ avis });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
