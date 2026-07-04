import { authorize, clientIp } from '@/lib/auth/guard';
import { handleApiError, ok } from '@/lib/http';
import { enviaJustificantsEmail } from '@/lib/services/justificants-email';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/estancies/:id/fitxa-email — envia per correu els 3 justificants
// (fitxa de registre, llibre de registre i comprovant de Mossos si n'hi ha).
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const result = await enviaJustificantsEmail(id, auth.id, clientIp(req));
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
