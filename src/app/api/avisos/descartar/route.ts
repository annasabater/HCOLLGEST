import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { created, handleApiError } from '@/lib/http';

// POST /api/avisos/descartar { tipus, entitatId } — amaga un avís del taulell
// per sempre (no torna a sortir). Idempotent.
const Schema = z.object({
  tipus: z.enum([
    'MOSSOS',
    'FIRMA',
    'ENVIAMENT_ERROR',
    'DADES_PENDENTS',
    'FACTURAR',
    'SERVEI_FACTURA',
    'COBRAMENT',
  ]),
  entitatId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const body = await req.json().catch(() => null);
    const { tipus, entitatId } = Schema.parse(body);
    await prisma.avisDescartat.upsert({
      where: { tipus_entitatId: { tipus, entitatId } },
      create: { tipus, entitatId, usuariId: auth.id },
      update: {},
    });
    return created({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
