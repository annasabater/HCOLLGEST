import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, ok } from '@/lib/http';
import { desconnectaCalendari } from '@/lib/services/calendari-connexio';
import { sincronitzaTotsRecordatoris } from '@/lib/services/calendari-recordatoris';

export const maxDuration = 60;

async function estat() {
  const est = await prisma.establiment.findFirst({
    select: { googleCalendarTokenEnc: true, googleCalendarId: true, calendariSyncError: true },
  });
  const pendents = await prisma.recordatori.count({ where: { deletedAt: null, fetAt: null, calendari: true } });
  return {
    connectat: !!(est?.googleCalendarTokenEnc && est.googleCalendarId),
    error: est?.calendariSyncError ?? null,
    pendents,
  };
}

// GET /api/calendari/google — estat de la connexió.
export async function GET() {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    return ok(await estat());
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/calendari/google — torna a posar tots els recordatoris al calendari.
export async function POST() {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const n = await sincronitzaTotsRecordatoris();
    return ok({ ...(await estat()), sincronitzats: n });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/calendari/google — oblida el permís (el calendari queda a Google).
export async function DELETE(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    await desconnectaCalendari();
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'establiment', detall: { googleCalendarConnectat: false }, ip: clientIp(req) });
    return ok(await estat());
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
