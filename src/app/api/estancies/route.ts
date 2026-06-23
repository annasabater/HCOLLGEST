import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { created, handleApiError, ok } from '@/lib/http';
import { RegistreSchema, RegistreEsborranySchema } from '@/lib/validation/registre';
import { createRegistre } from '@/lib/services/registre';
import { createFactura, addCobrament } from '@/lib/services/factura';
import { round2 } from '@/lib/factura-calc';
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

    // Cobrament opcional indicat al registre: crea un rebut amb el total i hi
    // registra cada cobrament pel seu mètode (p. ex. una part en efectiu i una
    // altra per transferència). Si falla, l'estada ja està creada: no es trenca
    // el registre, el cobrament es pot afegir després des de la fitxa.
    const pagaments = (input.pagaments ?? []).filter((p) => p.import > 0);
    let factura: { id: string; numero: string } | null = null;
    if (pagaments.length > 0) {
      try {
        const total = round2(pagaments.reduce((a, p) => a + p.import, 0));
        const f = await createFactura(
          {
            estanciaId: result.estanciaId,
            ivaPercent: 0,
            aplicarTasa: false,
            tipusDocument: 'RECIBO',
            linies: [{ concepte: 'ALLOTJAMENT', descripcio: 'Allotjament', import: total }],
          },
          { id: auth.id },
          clientIp(req),
        );
        for (const p of pagaments) {
          await addCobrament(f.id, { metode: p.metode, import: p.import }, { id: auth.id }, clientIp(req));
        }
        factura = { id: f.id, numero: f.numero };
      } catch {
        factura = null; // l'estada s'ha creat igualment
      }
    }

    return created({ ...result, factura });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
