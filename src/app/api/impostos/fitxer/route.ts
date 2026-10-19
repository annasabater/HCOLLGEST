import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError } from '@/lib/http';
import { bytesFitxer } from '@/lib/aeat/fitxer';
import { ErrorFitxer, generaFitxerAeat, parametresFitxer } from '@/lib/services/aeat';

// GET /api/impostos/fitxer?model=303&any=2026&trimestre=3&pagament=U
// Fitxer d'importació de l'AEAT (disseny de registre oficial) amb les caselles
// calculades a /impostos. Es baixa i s'importa al formulari de la Seu
// («Importar») per revisar-lo i presentar-lo amb el certificat o el DNIe.
export async function GET(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { model, any, trimestre, pagament } = parametresFitxer(new URL(req.url).searchParams);
    const { contingut } = await generaFitxerAeat(model, any, trimestre, pagament);

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
    if (err instanceof ErrorFitxer) return badRequest(err.message);
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
