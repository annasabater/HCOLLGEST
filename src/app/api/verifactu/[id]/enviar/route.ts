import { NextResponse } from 'next/server';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { handleApiError, ok } from '@/lib/http';
import { enviarRegistre, AeatNotConfiguredError } from '@/lib/services/verifactu';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/verifactu/:id/enviar — envia el registre a l'AEAT (servei SOAP)
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const result = await enviarRegistre(id, { id: auth.id }, clientIp(req));
    return ok(result);
  } catch (err) {
    if (err instanceof AeatNotConfiguredError) {
      return NextResponse.json({ error: err.message, code: 'AEAT_NO_CONFIG' }, { status: 422 });
    }
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
