import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { created, handleApiError, ok } from '@/lib/http';
import { RegistreSchema, RegistreEsborranySchema } from '@/lib/validation/registre';
import { createRegistre } from '@/lib/services/registre';
import { addPagamentEstada } from '@/lib/services/factura';
import type { Prisma } from '@prisma/client';

// GET /api/estancies?estat=&desde=&fins=&q=
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const estat = url.searchParams.get('estat');
  const desde = url.searchParams.get('desde');
  const fins = url.searchParams.get('fins');

  const where: Prisma.EstanciaWhereInput = { deletedAt: null };
  if (estat) where.estat = estat as Prisma.EstanciaWhereInput['estat'];
  if (desde || fins) {
    where.dataEntrada = {};
    if (desde) where.dataEntrada.gte = new Date(desde);
    if (fins) where.dataEntrada.lte = new Date(fins);
  }

  const estancies = await prisma.estancia.findMany({
    where,
    orderBy: { dataEntrada: 'desc' },
    take: 100,
    include: {
      viatgers: { include: { huesped: true } },
      enviaments: { orderBy: { createdAt: 'desc' }, take: 1 },
      habitacio: true,
    },
  });

  return ok({ estancies });
}

// POST /api/estancies — alta de estancia + viajeros (formulario maestro §2.3)
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;

    const borrany = new URL(req.url).searchParams.get('borrany') === '1';
    const body = await req.json().catch(() => null);
    // En esborrany s'admeten dades incompletes (§2.3 es valida en pujar a Mossos).
    const input = (borrany ? RegistreEsborranySchema : RegistreSchema).parse(body);

    const result = await createRegistre(input, { id: auth.id }, clientIp(req), {
      esBorrany: borrany,
    });

    // Cobrament(s) inicial(s) opcionals indicats al registre: es registren A
    // COMPTE de l'estada (sense factura encara). Després, des de la fitxa, es pot
    // fer la factura seleccionant quins s'hi inclouen. Si algun falla, l'estada
    // ja està creada: no es trenca el registre.
    const pagaments = (input.pagaments ?? []).filter((p) => p.import > 0);
    for (const p of pagaments) {
      try {
        await addPagamentEstada(
          result.estanciaId,
          { metode: p.metode, import: p.import },
          { id: auth.id },
          clientIp(req),
        );
      } catch {
        /* l'estada ja s'ha creat; el pagament es pot afegir després */
      }
    }

    return created({ ...result });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
