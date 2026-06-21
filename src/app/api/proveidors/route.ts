import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, ok } from '@/lib/http';
import { ProveidorCreateSchema } from '@/lib/validation/gasto';

export async function GET() {
  const auth = await authorize();
  if (auth instanceof Response) return auth;
  const proveidors = await prisma.proveidor.findMany({
    where: { deletedAt: null },
    orderBy: { nom: 'asc' },
  });
  return ok({ proveidors });
}

export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const body = await req.json().catch(() => null);
    const data = ProveidorCreateSchema.parse(body);
    const proveidor = await prisma.proveidor.create({
      data: { nom: data.nom, cif: data.cif ?? null, contacte: data.contacte ?? null },
    });
    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'proveidor',
      entitatId: proveidor.id,
      ip: clientIp(req),
    });
    return created({ proveidor });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
