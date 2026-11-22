import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { esNomesLectura, teVistaRestringida } from '@/lib/auth/restriccions';
import { audit } from '@/lib/audit';
import { handleApiError, ok, readJson } from '@/lib/http';

const Schema = z.object({ clau: z.string().min(1).max(100), text: z.string().max(1000) });

// PUT /api/ocupacio/nota — desa (o esborra, si és buida) la nota d'un contracte del full d'Ocupació.
export async function PUT(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    if (teVistaRestringida(auth) || esNomesLectura(auth)) return Response.json({ error: 'Sense permís' }, { status: 403 });
    const d = Schema.parse(await readJson(req));
    const text = d.text.trim();
    if (text) {
      await prisma.notaOcupacio.upsert({ where: { clau: d.clau }, create: { clau: d.clau, text }, update: { text } });
    } else {
      await prisma.notaOcupacio.deleteMany({ where: { clau: d.clau } });
    }
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'nota_ocupacio', entitatId: d.clau, ip: clientIp(req) });
    return ok({ text });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
