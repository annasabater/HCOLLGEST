import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { encryptString } from '@/lib/crypto';
import { badRequest, handleApiError, ok, readJson, serverError } from '@/lib/http';
import { WhatsappConfigSchema, WhatsappProvaSchema } from '@/lib/validation/recordatori';
import { normalitzaTelefon, parseDestinataris, type Destinatari } from '@/lib/whatsapp';
import { enviaProvaWhatsapp } from '@/lib/services/resum-whatsapp';

async function estat() {
  const est = await prisma.establiment.findFirst({
    select: { whatsappDestinataris: true, whatsappResumDia: true, whatsappError: true },
  });
  return {
    // Les claus mai surten del servidor: només si n'hi ha.
    destinataris: parseDestinataris(est?.whatsappDestinataris).map((d) => ({
      telefon: d.telefon,
      teClau: !!d.apikeyEnc,
      actiu: d.actiu,
    })),
    ultimResum: est?.whatsappResumDia ?? null,
    error: est?.whatsappError ?? null,
  };
}

// GET /api/establiment/whatsapp — números configurats (sense les claus).
export async function GET() {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    return ok(await estat());
  } catch (err) {
    return handleApiError(err);
  }
}

// PUT /api/establiment/whatsapp — { destinataris: [{ telefon, apikey?, actiu }] }
export async function PUT(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const v = WhatsappConfigSchema.parse(await readJson(req));
    const est = await prisma.establiment.findFirstOrThrow({ select: { id: true, whatsappDestinataris: true } });
    const abans = parseDestinataris(est.whatsappDestinataris);

    const nous: Destinatari[] = [];
    for (const d of v.destinataris) {
      const tel = normalitzaTelefon(d.telefon);
      if (!tel) return badRequest(`El número «${d.telefon}» no és vàlid (p. ex. 612345678).`);
      if (nous.some((x) => x.telefon === tel)) return badRequest(`El número ${d.telefon} hi és repetit.`);
      const apikeyEnc = d.apikey ? encryptString(d.apikey) : (abans.find((x) => x.telefon === tel)?.apikeyEnc ?? null);
      if (d.actiu && !apikeyEnc) return badRequest(`Per enviar-li el resum, el número ${d.telefon} necessita la seva clau de CallMeBot.`);
      nous.push({ telefon: tel, apikeyEnc, actiu: d.actiu });
    }

    await prisma.establiment.update({
      where: { id: est.id },
      data: {
        whatsappDestinataris: nous as unknown as Prisma.InputJsonValue,
        whatsappActiu: nous.some((d) => d.actiu),
      },
    });
    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'establiment',
      entitatId: est.id,
      // Sense números sencers ni claus a l'auditoria.
      detall: { whatsapp: { numeros: nous.length, actius: nous.filter((d) => d.actiu).length, clausCanviades: v.destinataris.filter((d) => d.apikey).length } },
      ip: clientIp(req),
    });
    return ok(await estat());
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/establiment/whatsapp — { telefon }: missatge de prova a aquest número.
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { telefon } = WhatsappProvaSchema.parse(await readJson(req));
    try {
      await enviaProvaWhatsapp(telefon);
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
