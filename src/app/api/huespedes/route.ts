import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, ok } from '@/lib/http';
import { HuespedCreateSchema } from '@/lib/validation/huesped';
import type { Prisma } from '@prisma/client';

// GET /api/huespedes?q=...  — lista / búsqueda
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();

  const where: Prisma.HuespedWhereInput = { deletedAt: null };
  if (q) {
    where.OR = [
      { nom: { contains: q, mode: 'insensitive' } },
      { cognom1: { contains: q, mode: 'insensitive' } },
      { cognom2: { contains: q, mode: 'insensitive' } },
      { numDocument: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { telefon: { contains: q, mode: 'insensitive' } },
    ];
  }

  const huespedes = await prisma.huesped.findMany({
    where,
    orderBy: [{ cognom1: 'asc' }, { nom: 'asc' }],
    take: 100,
  });
  return ok({ huespedes });
}

// POST /api/huespedes — alta de ficha CRM
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;

    const body = await req.json().catch(() => null);
    const data = HuespedCreateSchema.parse(body);

    const huesped = await prisma.huesped.create({
      data: {
        ...data,
        cognom2: data.cognom2 ?? null,
        sexe: data.sexe ?? null,
        tipusDocument: data.tipusDocument ?? null,
      },
    });

    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'huesped',
      entitatId: huesped.id,
      ip: clientIp(req),
    });

    return created({ huesped });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
