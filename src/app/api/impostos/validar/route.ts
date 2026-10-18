import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError, ok } from '@/lib/http';
import { validaAeat } from '@/lib/aeat/servei';
import { ErrorFitxer, generaFitxerAeat, parametresFitxer } from '@/lib/services/aeat';

export const maxDuration = 60;

// POST /api/impostos/validar  { model, any, trimestre, pagament }
// Envia el fitxer al servei oficial de VALIDACIÓ de l'AEAT (ServValiDos): no
// presenta res ni demana certificat. Torna els errors/avisos de l'AEAT i
// l'esborrany oficial en PDF (base64).
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { model, any, trimestre, pagament } = parametresFitxer((await req.json().catch(() => ({}))) as Record<string, unknown>);
    const f = await generaFitxerAeat(model, any, trimestre, pagament);
    const r = await validaAeat({ model, any, periode: f.periode, fitxer: f.contingut });

    await audit({
      usuariId: auth.id, accio: 'ENVIAMENT', entitat: 'declaracio_fiscal', entitatId: `${model}-${any}-${trimestre}`,
      detall: { accio: 'validacio_aeat', ok: r.ok, errors: r.errors.slice(0, 10) }, ip: clientIp(req),
    });
    return ok(r);
  } catch (err) {
    if (err instanceof ErrorFitxer) return badRequest(err.message);
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
