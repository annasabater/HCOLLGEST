import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError } from '@/lib/http';
import { proximNumeroPressupost } from '@/lib/services/pressupost';

// POST /api/pressupostos — crea un pressupost nou amb el següent número i una
// línia buida, i el compte per defecte (IBAN de l'establiment). Retorna l'id.
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;

    const numero = await proximNumeroPressupost(prisma);
    const est = await prisma.establiment.findFirst({ select: { iban: true } });
    const p = await prisma.pressupost.create({
      data: {
        numero,
        compte: est?.iban ?? null,
        ivaPercent: 21,
        base: 0,
        iva: 0,
        total: 0,
        linies: { create: [{ descripcio: '', import: 0 }] },
      },
    });
    await audit({ usuariId: auth.id, accio: 'CREACIO', entitat: 'pressupost', entitatId: p.id, ip: clientIp(req) });
    return created({ id: p.id, numero: p.numero });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
