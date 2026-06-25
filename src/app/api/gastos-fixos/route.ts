import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, ok } from '@/lib/http';
import type { FrequenciaServei, MetodeCobrament } from '@prisma/client';

export async function GET() {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const gastos = await prisma.serveiRecurrent.findMany({
      where: { esFix: true, deletedAt: null },
      orderBy: { activitat: 'asc' },
      include: {
        gastos: {
          where: { deletedAt: null },
          orderBy: { data: 'desc' },
          take: 3,
          select: { id: true, data: true, import: true },
        },
      },
    });
    return ok({ gastos });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;

    const body = await req.json().catch(() => null) as {
      activitat?: string;
      frequencia?: string;
      importPrevist?: string | number | null;
      metodePagament?: string;
      properaData?: string;
      observacions?: string | null;
    } | null;

    if (!body?.activitat || !body.properaData) {
      return Response.json({ error: 'activitat i properaData son obligatoris' }, { status: 400 });
    }

    const gasto = await prisma.serveiRecurrent.create({
      data: {
        activitat: body.activitat,
        frequencia: (body.frequencia ?? 'MENSUAL') as FrequenciaServei,
        importPrevist: body.importPrevist != null ? String(body.importPrevist) : null,
        metodePagament: (body.metodePagament ?? 'TRANSFERENCIA') as MetodeCobrament,
        properaData: new Date(body.properaData),
        observacions: body.observacions ?? null,
        esFix: true,
        generaDespesa: false,
        actiu: true,
      },
    });

    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'servei_recurrent',
      entitatId: gasto.id,
      ip: clientIp(req),
      detall: { esFix: true },
    });

    return created({ gasto });
  } catch (err) {
    return handleApiError(err);
  }
}
