import { authorize } from '@/lib/auth/guard';
import { ok, handleApiError } from '@/lib/http';
import { seguentNumeroContracte } from '@/lib/services/numero-contracte';

// GET /api/estancies/next-numero?any=YYYY
// Proposa el següent número de contracte per a l'any indicat (vegeu
// `seguentNumeroContracte`): el més alt registrat aquell any + 1, o {yy}001.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const anyNum = Number(new URL(req.url).searchParams.get('any')) || new Date().getFullYear();
    return ok({ numero: await seguentNumeroContracte(anyNum), any: anyNum });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
