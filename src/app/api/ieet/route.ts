import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { badRequest, handleApiError, ok } from '@/lib/http';
import { getIeetPeriode } from '@/lib/services/ieet';
import { esClauPeriode, periodePerDefecte } from '@/lib/ieet';

// GET /api/ieet?periode=2026-1 — taxa turística d'un període de declaració
// (2026-1 = abril–setembre 2026, 2026-2 = octubre 2026–març 2027; per defecte el
// que toca pagar o el que està en curs) i l'última pujada de l'Excel a Drive.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const clau = new URL(req.url).searchParams.get('periode') ?? periodePerDefecte(new Date());
    if (!esClauPeriode(clau)) return badRequest('Període no vàlid (format AAAA-1 o AAAA-2)');

    const [dades, darrera] = await Promise.all([
      getIeetPeriode(clau),
      prisma.auditLog.findFirst({
        where: { entitat: 'drive_export', detall: { path: ['tipus'], equals: 'ieet' } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, detall: true },
      }),
    ]);
    const det = (darrera?.detall ?? null) as { ok?: boolean; error?: string | null } | null;
    return ok({
      ...dades,
      drive: darrera ? { at: darrera.createdAt, ok: det?.ok !== false, error: det?.error ?? null } : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
