import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ROLES_ALL } from '@/lib/auth/rbac';
import { ok, handleApiError } from '@/lib/http';
import { normTelefon } from '@/lib/validation/avis';

// GET /api/avisos/check?telefon=&nom= — retorna avisos actius que coincideixin
export async function GET(req: Request) {
  try {
    const auth = await authorize(ROLES_ALL);
    if (auth instanceof Response) return auth;

    const sp = new URL(req.url).searchParams;
    const telefon = normTelefon(sp.get('telefon'));
    const nom = (sp.get('nom') ?? '').trim().toLowerCase();
    if (telefon.length < 6 && nom.length < 3) return ok({ avisos: [] });

    const actius = await prisma.avis.findMany({
      where: { actiu: true },
      select: { id: true, nom: true, telefon: true, motiu: true, gravetat: true, notes: true },
    });

    const avisos = actius.filter((a) => {
      const telMatch = telefon.length >= 6 && normTelefon(a.telefon) === telefon;
      const nomMatch = nom.length >= 3 && a.nom.toLowerCase().includes(nom);
      return telMatch || nomMatch;
    });

    return ok({ avisos });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
