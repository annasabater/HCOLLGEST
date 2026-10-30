import { authorize } from '@/lib/auth/guard';
import { ok, handleApiError } from '@/lib/http';
import { numeroContracteEnUs } from '@/lib/services/numero-contracte';

// GET /api/estancies/check-numero?any=YYYY&numero=NNNNN&exclou=<id>
// Comprova si un número de contracte ja està en ús per a l'any indicat
// (també com a contracte separat d'un viatger).
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const url = new URL(req.url);
    const anyNum = Number(url.searchParams.get('any')) || new Date().getFullYear();
    const numero = (url.searchParams.get('numero') ?? '').trim();
    return ok({ exists: await numeroContracteEnUs(anyNum, numero, url.searchParams.get('exclou')) });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
