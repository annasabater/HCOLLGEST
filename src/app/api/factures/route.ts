import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { created, handleApiError, ok } from '@/lib/http';
import { createFactura } from '@/lib/services/factura';

// GET /api/factures?estat=
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;
  const url = new URL(req.url);
  const estat = url.searchParams.get('estat');
  const where: Prisma.FacturaWhereInput = { deletedAt: null };
  if (estat === 'PENDENT' || estat === 'COBRADA') where.estat = estat;

  const factures = await prisma.factura.findMany({
    where,
    orderBy: { data: 'desc' },
    take: 100,
    include: {
      estancia: { include: { viatgers: { where: { esTitular: true }, include: { huesped: true } } } },
      cobraments: true,
    },
  });
  return ok({ factures });
}

// POST /api/factures
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const body = await req.json().catch(() => null);
    const factura = await createFactura(body, { id: auth.id }, clientIp(req));
    return created({ factura });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
