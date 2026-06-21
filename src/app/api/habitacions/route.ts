import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, ok } from '@/lib/http';

export async function GET() {
  const auth = await authorize();
  if (auth instanceof Response) return auth;
  const habitacions = await prisma.habitacio.findMany({
    where: { deletedAt: null },
    orderBy: { nom: 'asc' },
  });
  return ok({ habitacions });
}

const CreateSchema = z.object({
  nom: z.string().trim().min(1),
  descripcio: z.string().optional(),
  capacitat: z.coerce.number().int().min(1).optional(),
});

export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const body = await req.json().catch(() => null);
    const data = CreateSchema.parse(body);
    const habitacio = await prisma.habitacio.create({ data });
    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'habitacio',
      entitatId: habitacio.id,
      ip: clientIp(req),
    });
    return created({ habitacio });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
