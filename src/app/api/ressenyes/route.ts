import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, readJson } from '@/lib/http';
import { RessenyaCreateSchema } from '@/lib/validation/ressenya';
import { traduirRessenya } from '@/lib/services/traduccio-ressenya';

export const maxDuration = 60; // la traducció amb Claude pot trigar uns segons

// POST /api/ressenyes — alta manual d'una ressenya copiada de Google (entra PENDENT).
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const data = RessenyaCreateSchema.parse(await readJson(req));

    const ressenya = await prisma.ressenya.create({
      data: {
        font: 'MANUAL',
        autor: data.autor,
        puntuacio: data.puntuacio,
        text: data.text ?? null,
        idioma: data.idioma ?? null,
        dataRessenya: data.dataRessenya,
        resposta: data.resposta ?? null,
      },
    });

    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'ressenya',
      entitatId: ressenya.id,
      detall: { autor: ressenya.autor, puntuacio: ressenya.puntuacio },
      ip: clientIp(req),
    });

    // Traduccions als idiomes de la web. Si falla, la ressenya queda desada igual
    // i es pot reintentar des de /ressenyes («Tradueix»).
    const traduida = await traduirRessenya(ressenya.id);
    return created({ ...ressenya, traduida });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
