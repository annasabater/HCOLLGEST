import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, ok, readJson } from '@/lib/http';
import { nomDispositiu, pushConfigurat, vapidPublica } from '@/lib/push';

const SubscripcioSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
});

// GET /api/push — clau pública i mòbils que reben notificacions.
export async function GET() {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const subs = await prisma.pushSubscripcio.findMany({ orderBy: { createdAt: 'asc' } });
    return ok({
      configurat: pushConfigurat(),
      clauPublica: vapidPublica(),
      dispositius: subs.map((s) => ({
        id: s.id,
        endpoint: s.endpoint,
        nom: s.nom,
        resumMati: s.resumMati,
        alMoment: s.alMoment,
        darrerError: s.darrerError,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/push — aquest navegador vol rebre notificacions.
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const s = SubscripcioSchema.parse(await readJson(req));
    const nom = nomDispositiu(req.headers.get('user-agent'));
    const sub = await prisma.pushSubscripcio.upsert({
      where: { endpoint: s.endpoint },
      create: { endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth, nom, usuariId: auth.id },
      update: { p256dh: s.keys.p256dh, auth: s.keys.auth, darrerError: null },
    });
    await audit({ usuariId: auth.id, accio: 'CREACIO', entitat: 'push_subscripcio', entitatId: sub.id, detall: { nom }, ip: clientIp(req) });
    return created({ id: sub.id });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
