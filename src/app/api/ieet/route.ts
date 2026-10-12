import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { badRequest, handleApiError, ok } from '@/lib/http';
import { getIeetAny } from '@/lib/services/ieet';

// GET /api/ieet?any=2026 — taxa turística de l'any (una fila per persona) i
// l'hora de l'última pujada de l'Excel a Drive.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const any = Number(new URL(req.url).searchParams.get('any') ?? new Date().getFullYear());
    if (!Number.isInteger(any) || any < 2000 || any > 2100) return badRequest('Any no vàlid');

    const [dades, darrera] = await Promise.all([
      getIeetAny(any),
      prisma.auditLog.findFirst({
        where: { entitat: 'drive_export', detall: { path: ['tipus'], equals: 'ieet' } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, detall: true },
      }),
    ]);
    const det = (darrera?.detall ?? null) as { ok?: boolean } | null;
    return ok({ ...dades, drive: darrera ? { at: darrera.createdAt, ok: det?.ok !== false } : null });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
