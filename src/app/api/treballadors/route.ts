import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, ok } from '@/lib/http';
import { TreballadorCreateSchema } from '@/lib/validation/personal';

// GET /api/treballadors — campos no sensibles (para asignar tareas de neteja, etc.)
export async function GET() {
  const auth = await authorize();
  if (auth instanceof Response) return auth;
  const treballadors = await prisma.treballador.findMany({
    where: { deletedAt: null },
    orderBy: { nom: 'asc' },
    select: { id: true, nom: true, carrec: true, telefon: true },
  });
  return ok({ treballadors });
}

export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const body = await req.json().catch(() => null);
    const data = TreballadorCreateSchema.parse(body);
    const treballador = await prisma.treballador.create({
      data: {
        nom: data.nom,
        dni: data.dni ?? null,
        carrec: data.carrec,
        telefon: data.telefon ?? null,
        email: data.email ?? null,
        dataContractacio: data.dataContractacio ?? new Date(),
        preuHora: data.preuHora ?? null,
        preuSortida: data.preuSortida ?? null,
        preuManteniment: data.preuManteniment ?? null,
        preuZones: data.preuZones ?? null,
        salari: data.salari ?? null,
        costEmpresa: data.costEmpresa ?? null,
      },
    });
    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'treballador',
      entitatId: treballador.id,
      ip: clientIp(req),
    });
    return created({ treballador });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
