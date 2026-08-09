import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError } from '@/lib/http';
import { PagamentPrevistCreateSchema } from '@/lib/validation/pagament-previst';

// POST /api/estancies/:id/pagaments-previstos — afegeix un cobrament previst/pendent
// (import + data prevista). El tauler n'avisa des del dia abans fins que es paga.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const input = PagamentPrevistCreateSchema.parse(body);

    const pp = await prisma.pagamentPrevist.create({
      data: {
        estanciaId: id,
        import: input.import,
        dataPrevista: new Date(input.dataPrevista),
        concepte: input.concepte ?? null,
      },
    });
    await audit({ usuariId: auth.id, accio: 'CREACIO', entitat: 'pagament_previst', entitatId: pp.id, detall: { estanciaId: id, import: input.import }, ip: clientIp(req) });
    return created({ id: pp.id });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
