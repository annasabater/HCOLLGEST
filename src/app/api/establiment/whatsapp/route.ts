import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { encryptString } from '@/lib/crypto';
import { badRequest, handleApiError, ok, readJson, serverError } from '@/lib/http';
import { WhatsappConfigSchema } from '@/lib/validation/recordatori';
import { normalitzaTelefon } from '@/lib/whatsapp';
import { enviaProvaWhatsapp } from '@/lib/services/resum-whatsapp';

async function estat() {
  const est = await prisma.establiment.findFirst({
    select: { whatsappActiu: true, whatsappTelefon: true, whatsappApiKeyEnc: true, whatsappResumDia: true, whatsappError: true },
  });
  return {
    actiu: est?.whatsappActiu ?? false,
    telefon: est?.whatsappTelefon ?? null,
    teClau: !!est?.whatsappApiKeyEnc, // la clau mai surt del servidor
    ultimResum: est?.whatsappResumDia ?? null,
    error: est?.whatsappError ?? null,
  };
}

// GET /api/establiment/whatsapp — estat de la connexió (sense la clau).
export async function GET() {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    return ok(await estat());
  } catch (err) {
    return handleApiError(err);
  }
}

// PUT /api/establiment/whatsapp — { telefon, apikey?, actiu }
export async function PUT(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const v = WhatsappConfigSchema.parse(await readJson(req));
    const telefon = v.telefon ? normalitzaTelefon(v.telefon) : null;
    if (v.telefon && !telefon) return badRequest('El número no és vàlid (p. ex. 612345678 o +34 612 345 678).');
    const est = await prisma.establiment.findFirstOrThrow({ select: { id: true, whatsappApiKeyEnc: true } });
    if (v.actiu && (!telefon || (!v.apikey && !est.whatsappApiKeyEnc))) {
      return badRequest('Per activar-lo calen el número i la clau de CallMeBot.');
    }
    await prisma.establiment.update({
      where: { id: est.id },
      data: {
        whatsappActiu: v.actiu,
        whatsappTelefon: telefon,
        ...(v.apikey ? { whatsappApiKeyEnc: encryptString(v.apikey) } : {}),
      },
    });
    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'establiment',
      entitatId: est.id,
      detall: { whatsapp: { actiu: v.actiu, telefon: !!telefon, clauCanviada: !!v.apikey } },
      ip: clientIp(req),
    });
    return ok(await estat());
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/establiment/whatsapp — envia un missatge de prova.
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    try {
      await enviaProvaWhatsapp();
    } catch (err) {
      return serverError(err instanceof Error ? err.message : 'No s’ha pogut enviar');
    }
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'whatsapp', detall: { prova: true }, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
