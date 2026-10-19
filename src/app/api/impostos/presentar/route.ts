import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError, ok } from '@/lib/http';
import { ErrorFitxer, parametresFitxer, presentaDeclaracio } from '@/lib/services/aeat';

export const maxDuration = 60;

// POST /api/impostos/presentar
//   { model, any, trimestre, pagament, contrasenya?, nrc?, conformitat: true }
// PRESENTA l'autoliquidació a l'AEAT amb el certificat de la titular. És
// irreversible: cal la conformitat explícita (l'especificació de l'AEAT obliga
// a mostrar les dades i recollir-la). La contrasenya del certificat és
// l'escrita o, si no se n'escriu cap, la desada (xifrada).
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.conformitat !== true) return badRequest('Cal confirmar que les dades són correctes abans de presentar');
    // Buida: es fa servir la desada (si la titular ha triat que es recordi).
    const contrasenya = typeof body.contrasenya === 'string' ? body.contrasenya : '';
    const { model, any, trimestre, pagament } = parametresFitxer(body);

    const r = await presentaDeclaracio({
      model, any, trimestre, pagament, contrasenya,
      nrc: typeof body.nrc === 'string' ? body.nrc : undefined,
      usuariId: auth.id,
    });
    await audit({
      usuariId: auth.id, accio: 'ENVIAMENT', entitat: 'declaracio_fiscal', entitatId: `${model}-${any}-${trimestre}`,
      detall: {
        accio: 'presentacio_aeat', entorn: r.entorn, ok: r.ok, csv: r.csv, justificant: r.justificant,
        pagament, errors: r.errors.slice(0, 10),
      },
      ip: clientIp(req),
    });
    return ok(r);
  } catch (err) {
    if (err instanceof ErrorFitxer) return badRequest(err.message);
    // Contrasenya incorrecta o error de connexió amb l'AEAT: missatge entenedor.
    if (err instanceof Error && /contrasenya|AEAT|ECONN|ETIMEDOUT|ENOTFOUND|certificate|socket/i.test(err.message)) {
      return badRequest(err.message);
    }
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
