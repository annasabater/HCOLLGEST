import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError, ok } from '@/lib/http';
import { getImpostosAny } from '@/lib/services/impostos';
import { ConfigImpostosSchema } from '@/lib/validation/impostos';

const ESTABLIMENT_ID = 'hostal-coll';

// GET /api/impostos?any=2026 — 303/130/115 de cada trimestre i 390/180 de l'any,
// calculats del llibre d'IVA i encadenats amb les autoliquidacions presentades.
export async function GET(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const anyParam = new URL(req.url).searchParams.get('any');
    const any = anyParam ? Number(anyParam) : new Date().getFullYear();
    if (!Number.isInteger(any) || any < 2020 || any > 2100) return badRequest('Any no vàlid');
    return ok(await getImpostosAny(any));
  } catch (err) {
    return handleApiError(err);
  }
}

// PATCH /api/impostos — dades fixes dels impostos (referència cadastral del local).
export async function PATCH(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const input = ConfigImpostosSchema.parse(await req.json().catch(() => null));
    await prisma.establiment.update({
      where: { id: ESTABLIMENT_ID },
      data: { referenciaCadastral: input.referenciaCadastral || null },
    });
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'establiment', entitatId: ESTABLIMENT_ID, detall: { referenciaCadastral: input.referenciaCadastral }, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
