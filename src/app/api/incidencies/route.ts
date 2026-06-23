import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ALL, ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, ok, handleApiError } from '@/lib/http';
import { IncidenciaCreateSchema } from '@/lib/validation/incidencia';

// GET /api/incidencies?estat= — llista d'incidències de manteniment
export async function GET(req: Request) {
  try {
    const auth = await authorize(ROLES_ALL);
    if (auth instanceof Response) return auth;
    const estat = new URL(req.url).searchParams.get('estat');
    const incidencies = await prisma.incidencia.findMany({
      where: estat === 'OBERTA' || estat === 'EN_CURS' || estat === 'RESOLTA' ? { estat } : {},
      orderBy: [{ estat: 'asc' }, { data: 'desc' }],
      include: { habitacio: { select: { nom: true } } },
    });
    return ok({ incidencies });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/incidencies — crea una incidència
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const body = await req.json().catch(() => null);
    const data = IncidenciaCreateSchema.parse(body);
    const incidencia = await prisma.incidencia.create({
      data: {
        titol: data.titol,
        descripcio: data.descripcio ?? null,
        habitacioId: data.habitacioId ?? null,
        prioritat: data.prioritat,
        cost: data.cost ?? null,
        notes: data.notes ?? null,
      },
    });
    await audit({ usuariId: auth.id, accio: 'CREACIO', entitat: 'incidencia', entitatId: incidencia.id, ip: clientIp(req) });
    return created({ incidencia });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
