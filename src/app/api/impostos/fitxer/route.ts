import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError } from '@/lib/http';
import { getImpostosAny } from '@/lib/services/impostos';
import { bytesFitxer } from '@/lib/aeat/fitxer';
import { fitxer115, fitxer130, fitxer303, type FormaPagament } from '@/lib/aeat/models';

const GENERADORS = { '303': fitxer303, '130': fitxer130, '115': fitxer115 } as const;
type ModelFitxer = keyof typeof GENERADORS;

// GET /api/impostos/fitxer?model=303&any=2026&trimestre=3&pagament=U
// Fitxer d'importació de l'AEAT (disseny de registre oficial) amb les caselles
// calculades a /impostos. Es baixa i s'importa al formulari de la Sede
// («Importar») per revisar-lo i presentar-lo amb el certificat o el DNIe.
export async function GET(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const q = new URL(req.url).searchParams;
    const model = q.get('model') as ModelFitxer | null;
    const any = Number(q.get('any'));
    const trimestre = Number(q.get('trimestre'));
    const pagament = (q.get('pagament') === 'I' ? 'I' : 'U') as FormaPagament;
    if (!model || !(model in GENERADORS)) return badRequest('Model no vàlid (303, 130 o 115)');
    if (!Number.isInteger(any) || any < 2026 || any > 2100) return badRequest('Any no vàlid (el format és el del 2026 en endavant)');
    if (!Number.isInteger(trimestre) || trimestre < 1 || trimestre > 4) return badRequest('Trimestre no vàlid');

    const [dades, establiment] = await Promise.all([
      getImpostosAny(any),
      prisma.establiment.findFirst({ select: { iban: true } }),
    ]);
    const t = dades.trimestres.find((x) => x.trimestre === trimestre);
    if (!t) return badRequest('Trimestre no vàlid');
    const caselles = t.models[model].calculades;

    let contingut: string;
    try {
      contingut = GENERADORS[model](caselles, {
        nif: dades.titular.nif,
        nomComplet: dades.titular.nom,
        any,
        trimestre,
        formaPagament: pagament,
        iban: establiment?.iban,
      });
    } catch (e) {
      return badRequest(e instanceof Error ? e.message : 'No s’ha pogut generar el fitxer');
    }

    await audit({
      usuariId: auth.id, accio: 'DESCARREGA', entitat: 'declaracio_fiscal', entitatId: `${model}-${any}-${trimestre}`,
      detall: { model, any, trimestre, pagament }, ip: clientIp(req),
    });
    return new Response(new Uint8Array(bytesFitxer(contingut)), {
      headers: {
        'Content-Type': 'text/plain; charset=ISO-8859-1',
        'Content-Disposition': `attachment; filename="${model}_${any}_${trimestre}T.txt"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
