import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError } from '@/lib/http';
import { PagamentPrevistCreateSchema } from '@/lib/validation/pagament-previst';
import { recordatoriPerCobramentNou } from '@/lib/services/cobrament-recordatori';
import { sincronitzaRecordatoris } from '@/lib/services/calendari-recordatoris';

// POST /api/estancies/:id/pagaments-previstos — afegeix un cobrament previst/pendent
// (import + data prevista). El tauler n'avisa des del dia abans fins que es paga.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const input = PagamentPrevistCreateSchema.parse(body);

    // El cobrament pendent i el recordatori «M'ha de pagar» són el mateix: es creen junts.
    const { pp, recordatoriId } = await prisma.$transaction(async (tx) => {
      const pp = await tx.pagamentPrevist.create({
        data: {
          estanciaId: id,
          import: input.import,
          dataPrevista: new Date(input.dataPrevista),
          concepte: input.concepte ?? null,
        },
      });
      return { pp, recordatoriId: await recordatoriPerCobramentNou(tx, pp) };
    });
    await audit({ usuariId: auth.id, accio: 'CREACIO', entitat: 'pagament_previst', entitatId: pp.id, detall: { estanciaId: id, import: input.import, recordatoriId }, ip: clientIp(req) });
    await sincronitzaRecordatoris([recordatoriId]);
    return created({ id: pp.id });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
