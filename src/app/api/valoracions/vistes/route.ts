import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, ok, readJson } from '@/lib/http';

const Schema = z.object({ ids: z.array(z.string().min(1).max(40)).min(1).max(100) });

// POST /api/valoracions/vistes — marca valoracions com a llegides (el pop-up del
// panell ja no les torna a mostrar, en cap dispositiu).
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { ids } = Schema.parse(await readJson(req));

    const r = await prisma.valoracio.updateMany({ where: { id: { in: ids }, vista: false }, data: { vista: true } });

    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'valoracio',
      detall: { vistes: r.count },
      ip: clientIp(req),
    });
    return ok({ ok: true, count: r.count });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
