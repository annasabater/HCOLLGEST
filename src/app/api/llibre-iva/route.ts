import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { ok, handleApiError } from '@/lib/http';

// GET /api/llibre-iva — registre dels llibres d'IVA trimestrals desats.
export async function GET() {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const rows = await prisma.llibreIvaTrimestre.findMany({
      orderBy: [{ any: 'desc' }, { trimestre: 'desc' }],
      select: { periode: true, etiqueta: true, totalBase: true, totalIva: true, totalTotal: true, updatedAt: true },
    });
    return ok({
      desats: rows.map((r) => ({
        periode: r.periode, etiqueta: r.etiqueta,
        totalBase: Number(r.totalBase), totalIva: Number(r.totalIva), totalTotal: Number(r.totalTotal),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
