import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError, ok } from '@/lib/http';
import { encryptBuffer } from '@/lib/crypto';
import { ErrorCertificat, llegeixCertificat } from '@/lib/aeat/certificat';

const ESTABLIMENT_ID = 'hostal-coll';
const MAX_BYTES = 50 * 1024;

async function info() {
  const e = await prisma.establiment.findUnique({
    where: { id: ESTABLIMENT_ID },
    select: { aeatCertificat: true, aeatCertNif: true, aeatCertNom: true, aeatCertCaduca: true, aeatEntorn: true },
  });
  return {
    configurat: !!e?.aeatCertificat,
    nif: e?.aeatCertNif ?? null,
    nom: e?.aeatCertNom ?? null,
    caduca: e?.aeatCertCaduca?.toISOString() ?? null,
    entorn: (e?.aeatEntorn === 'produccio' ? 'produccio' : 'proves') as 'produccio' | 'proves',
  };
}

// GET /api/aeat/certificat — dades del certificat (mai el certificat en si).
export async function GET() {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    return ok(await info());
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/aeat/certificat (multipart: fitxer .p12/.pfx + contrasenya)
// La contrasenya només s'usa per llegir-lo i NO es desa: el certificat es guarda
// xifrat i continua protegit per ella (s'haurà d'escriure a cada presentació).
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const form = await req.formData();
    const fitxer = form.get('fitxer');
    const contrasenya = String(form.get('contrasenya') ?? '');
    if (!(fitxer instanceof Blob) || fitxer.size === 0) return badRequest('Cal triar el fitxer del certificat (.p12 o .pfx)');
    if (fitxer.size > MAX_BYTES) return badRequest('El fitxer és massa gran per ser un certificat');
    if (!contrasenya) return badRequest('Cal la contrasenya del certificat');

    let llegit: ReturnType<typeof llegeixCertificat>;
    try {
      llegit = llegeixCertificat(Buffer.from(await fitxer.arrayBuffer()), contrasenya);
    } catch (e) {
      if (e instanceof ErrorCertificat) return badRequest(e.message);
      throw e;
    }
    await prisma.establiment.update({
      where: { id: ESTABLIMENT_ID },
      data: {
        aeatCertificat: encryptBuffer(llegit.p12).toString('base64'),
        aeatCertNif: llegit.info.nif,
        aeatCertNom: llegit.info.nom,
        aeatCertCaduca: llegit.info.caduca,
      },
    });
    await audit({
      usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'establiment', entitatId: ESTABLIMENT_ID,
      detall: { accio: 'certificat_aeat', nif: llegit.info.nif, caduca: llegit.info.caduca }, ip: clientIp(req),
    });
    return ok(await info());
  } catch (err) {
    return handleApiError(err);
  }
}

// PATCH /api/aeat/certificat { entorn: 'proves' | 'produccio' }
export async function PATCH(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { entorn } = (await req.json().catch(() => ({}))) as { entorn?: string };
    if (entorn !== 'proves' && entorn !== 'produccio') return badRequest('Entorn no vàlid');
    await prisma.establiment.update({ where: { id: ESTABLIMENT_ID }, data: { aeatEntorn: entorn } });
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'establiment', entitatId: ESTABLIMENT_ID, detall: { aeatEntorn: entorn }, ip: clientIp(req) });
    return ok(await info());
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/aeat/certificat — esborra el certificat del servidor.
export async function DELETE(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    await prisma.establiment.update({
      where: { id: ESTABLIMENT_ID },
      data: { aeatCertificat: null, aeatCertNif: null, aeatCertNom: null, aeatCertCaduca: null },
    });
    await audit({ usuariId: auth.id, accio: 'ELIMINACIO', entitat: 'establiment', entitatId: ESTABLIMENT_ID, detall: { accio: 'certificat_aeat' }, ip: clientIp(req) });
    return ok(await info());
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
