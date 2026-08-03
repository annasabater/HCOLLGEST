import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError } from '@/lib/http';
import { z } from 'zod';
import { metodeCobramentValues } from '@/lib/validation/enums';
import { registrarFacturaServei } from '@/lib/services/serveis-recurrents';

const optNum = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.number().optional(),
);

const RegistrarSchema = z.object({
  data: z.coerce.date(),
  import: z.coerce.number().positive('L’import ha de ser positiu'),
  esFianca: z.coerce.boolean().optional(),
  metodePagament: z.enum(metodeCobramentValues).optional(),
  baseImposable: optNum,
  ivaPercent: optNum,
  irpfPercent: optNum,
  numFactura: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().optional()),
  adjuntPath: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().optional()),
});

type Ctx = { params: Promise<{ id: string }> };

// POST /api/serveis-recurrents/:id/registrar — registra la factura d'un servei
// (crea la despesa amb data/import reals + opcions i avança la propera data).
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const d = RegistrarSchema.parse(body);

    const res = await registrarFacturaServei(
      id,
      {
        data: d.data,
        import: d.import,
        esFianca: d.esFianca,
        metodePagament: d.metodePagament,
        baseImposable: d.baseImposable ?? null,
        ivaPercent: d.ivaPercent ?? null,
        irpfPercent: d.irpfPercent ?? null,
        numFactura: d.numFactura ?? null,
        adjuntPath: d.adjuntPath ?? null,
      },
      auth.id,
    );

    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'servei_recurrent',
      entitatId: id,
      detall: { accio: 'registrar_factura', gastoId: res.gastoId },
      ip: clientIp(req),
    });
    return created(res);
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
