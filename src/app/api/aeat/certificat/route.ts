import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError, ok } from '@/lib/http';
import tls from 'node:tls';
import { decryptBuffer, encryptBuffer, encryptString } from '@/lib/crypto';
import { ErrorCertificat, llegeixCertificat } from '@/lib/aeat/certificat';

const ESTABLIMENT_ID = 'hostal-coll';
const MAX_BYTES = 50 * 1024;

async function info() {
  const e = await prisma.establiment.findUnique({
    where: { id: ESTABLIMENT_ID },
    select: { aeatCertificat: true, aeatCertNif: true, aeatCertNom: true, aeatCertCaduca: true, aeatEntorn: true, aeatCertContrasenya: true },
  });
  return {
    configurat: !!e?.aeatCertificat,
    nif: e?.aeatCertNif ?? null,
    nom: e?.aeatCertNom ?? null,
    caduca: e?.aeatCertCaduca?.toISOString() ?? null,
    entorn: (e?.aeatEntorn === 'produccio' ? 'produccio' : 'proves') as 'produccio' | 'proves',
    /** La contrasenya està desada (xifrada): no cal escriure-la a cada presentació. */
    contrasenyaDesada: !!e?.aeatCertContrasenya,
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

// POST /api/aeat/certificat (multipart: fitxer .p12/.pfx + contrasenya [+ recorda=1])
// El certificat es guarda xifrat i continua protegit per la contrasenya. Si
// «recorda», la contrasenya també es desa XIFRADA i no s'haurà d'escriure més.
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const form = await req.formData();
    const fitxer = form.get('fitxer');
    const contrasenya = String(form.get('contrasenya') ?? '');
    const recorda = form.get('recorda') === '1';
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
        aeatCertContrasenya: recorda ? encryptString(contrasenya) : null,
      },
    });
    await audit({
      usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'establiment', entitatId: ESTABLIMENT_ID,
      detall: { accio: 'certificat_aeat', nif: llegit.info.nif, caduca: llegit.info.caduca, contrasenyaDesada: recorda }, ip: clientIp(req),
    });
    return ok(await info());
  } catch (err) {
    return handleApiError(err);
  }
}

// PATCH /api/aeat/certificat
//   { entorn: 'proves' | 'produccio' }  ·  { recordaContrasenya: '…' }  ·  { oblidaContrasenya: true }
export async function PATCH(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const body = (await req.json().catch(() => ({}))) as { entorn?: string; recordaContrasenya?: string; oblidaContrasenya?: boolean };

    if (body.entorn !== undefined) {
      if (body.entorn !== 'proves' && body.entorn !== 'produccio') return badRequest('Entorn no vàlid');
      await prisma.establiment.update({ where: { id: ESTABLIMENT_ID }, data: { aeatEntorn: body.entorn } });
      await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'establiment', entitatId: ESTABLIMENT_ID, detall: { aeatEntorn: body.entorn }, ip: clientIp(req) });
    }

    if (typeof body.recordaContrasenya === 'string') {
      const e = await prisma.establiment.findUnique({ where: { id: ESTABLIMENT_ID }, select: { aeatCertificat: true } });
      if (!e?.aeatCertificat) return badRequest('Primer cal pujar el certificat');
      // Només es desa si de debò obre el certificat.
      try {
        tls.createSecureContext({ pfx: decryptBuffer(Buffer.from(e.aeatCertificat, 'base64')), passphrase: body.recordaContrasenya });
      } catch {
        return badRequest('La contrasenya del certificat no és correcta');
      }
      await prisma.establiment.update({ where: { id: ESTABLIMENT_ID }, data: { aeatCertContrasenya: encryptString(body.recordaContrasenya) } });
      await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'establiment', entitatId: ESTABLIMENT_ID, detall: { accio: 'contrasenya_certificat_aeat', desada: true }, ip: clientIp(req) });
    }

    if (body.oblidaContrasenya === true) {
      await prisma.establiment.update({ where: { id: ESTABLIMENT_ID }, data: { aeatCertContrasenya: null } });
      await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'establiment', entitatId: ESTABLIMENT_ID, detall: { accio: 'contrasenya_certificat_aeat', desada: false }, ip: clientIp(req) });
    }
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
      data: { aeatCertificat: null, aeatCertNif: null, aeatCertNom: null, aeatCertCaduca: null, aeatCertContrasenya: null },
    });
    await audit({ usuariId: auth.id, accio: 'ELIMINACIO', entitat: 'establiment', entitatId: ESTABLIMENT_ID, detall: { accio: 'certificat_aeat' }, ip: clientIp(req) });
    return ok(await info());
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
