import { authorize } from '@/lib/auth/guard';
import { badRequest, ok } from '@/lib/http';
import { provinciaToINE, municipisDeProvincia } from '@/lib/mossos/codis';

// GET /api/municipis?provincia=<nom> — llista de municipis (INE) d'una província,
// per al selector del formulari. La província arriba pel nom (com a geo.ts).
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  const provincia = new URL(req.url).searchParams.get('provincia');
  if (!provincia) return badRequest('Cal indicar la província');

  const cpro = provinciaToINE(provincia);
  if (!cpro) return ok({ cpro: null, municipis: [] });

  return ok({ cpro, municipis: municipisDeProvincia(cpro) });
}

export const dynamic = 'force-dynamic';
