import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, notFound, ok, readJson } from '@/lib/http';
import { GoogleResumSchema } from '@/lib/validation/ressenya';

// PUT /api/ressenyes/google — nota mitjana, total i enllaç REALS de la fitxa de Google.
export async function PUT(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const data = GoogleResumSchema.parse(await readJson(req));

    const est = await prisma.establiment.findFirst({ select: { id: true } });
    if (!est) return notFound('Establiment no configurat');
    await prisma.establiment.update({ where: { id: est.id }, data });

    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'establiment',
      entitatId: est.id,
      detall: { ressenyesGoogle: data },
      ip: clientIp(req),
    });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
