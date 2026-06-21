import { authorize } from '@/lib/auth/guard';
import { ok } from '@/lib/http';
import { getVerifactuChain } from '@/lib/services/verifactu';

// GET /api/verifactu — cadena de registres Veri*Factu + verificació d'integritat
export async function GET() {
  const auth = await authorize();
  if (auth instanceof Response) return auth;
  return ok(await getVerifactuChain());
}

export const dynamic = 'force-dynamic';
