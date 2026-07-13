import { authorize, clientIp } from '@/lib/auth/guard';
import { handleApiError, ok } from '@/lib/http';
import { enviaFacturaEmail } from '@/lib/services/factura-email';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/factures/:id/email — envia la factura (PDF adjunt) al correu de l'hostal.
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const result = await enviaFacturaEmail(id, auth.id, clientIp(req));
    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
