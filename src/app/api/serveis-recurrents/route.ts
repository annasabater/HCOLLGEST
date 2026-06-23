import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, ok } from '@/lib/http';
import { ServeiCreateSchema } from '@/lib/validation/servei';
import { generarDespesesVencudes } from '@/lib/services/serveis-recurrents';

// GET /api/serveis-recurrents — llista de serveis (i genera els vençuts de passada).
export async function GET() {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  // Generació mandrosa: en obrir la pàgina, posa al dia les despeses vençudes.
  try {
    await generarDespesesVencudes();
  } catch (err) {
    console.error('[serveis] generació mandrosa:', err);
  }

  const serveis = await prisma.serveiRecurrent.findMany({
    where: { deletedAt: null },
    orderBy: [{ actiu: 'desc' }, { properaData: 'asc' }],
    include: { proveidor: true, categoria: true },
  });
  return ok({ serveis });
}

// POST /api/serveis-recurrents — alta d'un servei recurrent.
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const body = await req.json().catch(() => null);
    const data = ServeiCreateSchema.parse(body);

    const servei = await prisma.serveiRecurrent.create({
      data: {
        activitat: data.activitat,
        proveidorId: data.proveidorId ?? null,
        categoriaId: data.categoriaId ?? null,
        frequencia: data.frequencia,
        importPrevist: data.importPrevist ?? null,
        metodePagament: data.metodePagament,
        properaData: data.properaData,
        vigenciaInici: data.vigenciaInici ?? null,
        vigenciaFi: data.vigenciaFi ?? null,
        generaDespesa: data.generaDespesa,
        observacions: data.observacions ?? null,
        actiu: data.actiu,
      },
    });
    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'servei_recurrent',
      entitatId: servei.id,
      ip: clientIp(req),
    });
    return created({ servei });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
