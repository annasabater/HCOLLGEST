import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, ok, handleApiError } from '@/lib/http';
import { TarifaCreateSchema } from '@/lib/validation/tarifa';

// GET /api/tarifes — llista de tarifes (ADMIN)
export async function GET() {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const tarifes = await prisma.tarifa.findMany({
      orderBy: [{ actiu: 'desc' }, { nom: 'asc' }],
      include: { habitacio: { select: { nom: true } } },
    });
    return ok({ tarifes });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/tarifes — crea una tarifa (ADMIN)
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const body = await req.json().catch(() => null);
    const data = TarifaCreateSchema.parse(body);
    const tarifa = await prisma.tarifa.create({
      data: {
        nom: data.nom,
        preuNit: data.preuNit,
        tipusHabitacio: data.tipusHabitacio ?? null,
        habitacioId: data.habitacioId ?? null,
        dataInici: data.dataInici ?? null,
        dataFi: data.dataFi ?? null,
      },
    });
    await audit({ usuariId: auth.id, accio: 'CREACIO', entitat: 'tarifa', entitatId: tarifa.id, ip: clientIp(req) });
    return created({ tarifa });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
