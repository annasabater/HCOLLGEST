import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { conflict, created, handleApiError, notFound, ok } from '@/lib/http';
import { AmpliacioSchema } from '@/lib/validation/registre';
import { ampliarEstancia } from '@/lib/services/registre';
import { numeroContinuacio, numeroContracteEnUs, seguentNumeroContracte } from '@/lib/services/numero-contracte';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/estancies/:id/ampliar — opcions de número de contracte per a una nova
// ampliació: la continuació de l'arrel (26009_1, o null si no té número) i el
// següent número lliure de l'any.
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const base = await prisma.estancia.findUnique({ where: { id }, select: { id: true, estanciaOrigenId: true } });
    if (!base) return notFound('Estada no trobada');
    const rootId = base.estanciaOrigenId ?? base.id;
    const root = await prisma.estancia.findUniqueOrThrow({
      where: { id: rootId },
      select: { numContracte: true, anyContracte: true, dataEntrada: true, dataSortida: true },
    });
    const [continuacio, nou] = await Promise.all([
      numeroContinuacio(rootId, root.numContracte),
      seguentNumeroContracte(root.anyContracte),
    ]);
    return ok({
      arrel: { numContracte: root.numContracte, anyContracte: root.anyContracte, dataEntrada: root.dataEntrada, dataSortida: root.dataSortida },
      continuacio,
      nou,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/estancies/:id/ampliar — crea una ampliació enllaçada (26009_1, 26009_2…)
// o, si es tria, amb un número nou / escrit a mà / sense número.
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const { dataEntrada, dataSortida, habitacioId, reaprofitarFirmes, dataSignatura, llocSignatura, numContracte } =
      AmpliacioSchema.parse(body);

    if (numContracte) {
      const base = await prisma.estancia.findUnique({ where: { id }, select: { anyContracte: true } });
      if (!base) return notFound('Estada no trobada');
      if (await numeroContracteEnUs(base.anyContracte, numContracte)) {
        return conflict(`El número de contracte ${numContracte} ja el fa servir una altra estada.`);
      }
    }

    const result = await ampliarEstancia(
      id,
      { dataEntrada, dataSortida, habitacioId, reaprofitarFirmes, dataSignatura, llocSignatura, numContracte },
      { id: auth.id },
      clientIp(req),
    );
    return created(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
