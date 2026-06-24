import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, handleApiError } from '@/lib/http';
import { decryptString } from '@/lib/crypto';
import {
  getAccessToken,
  ensureFolder,
  ensureFolderPath,
  uploadOrUpdateFile,
  XLSX_MIME,
} from '@/lib/drive';
import { buildHostesXlsx } from '@/lib/exports/hostes-xlsx';

const ESTABLIMENT_ID = 'hostal-coll';
const MESOS = [
  'gener', 'febrer', 'març', 'abril', 'maig', 'juny',
  'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre',
];

/**
 * GET /api/cron/drive-mensual — export mensual a Google Drive.
 * L'invoca el cron de Vercel (dia 1, amb Bearer CRON_SECRET) per arxivar el mes
 * ANTERIOR, o un ADMIN manualment des de Configuració (?mes=actual per provar amb
 * el mes en curs).
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronOk = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    let actorId: string | null = null;
    if (!cronOk) {
      const auth = await authorize(ROLES_ADMIN);
      if (auth instanceof Response) return auth;
      actorId = auth.id;
    }

    const est = await prisma.establiment.findFirst({
      select: { driveRefreshTokenEnc: true, driveFolderId: true },
    });
    if (!est?.driveRefreshTokenEnc) {
      return ok({ ok: false, error: 'Google Drive no està connectat. Connecta’l a Configuració.' });
    }

    const token = await getAccessToken(decryptString(est.driveRefreshTokenEnc));

    // Carpeta arrel (es crea el primer cop i es recorda).
    let rootId = est.driveFolderId;
    if (!rootId) {
      rootId = await ensureFolder(token, 'Hostal Coll — Gestió');
      await prisma.establiment.update({ where: { id: ESTABLIMENT_ID }, data: { driveFolderId: rootId } });
    }

    // Mes a arxivar: per defecte l'anterior (el cron corre el dia 1); ?mes=actual
    // per a la prova manual amb el mes en curs.
    const mesActual = new URL(req.url).searchParams.get('mes') === 'actual';
    const now = new Date();
    const ref = mesActual ? now : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const any = String(ref.getFullYear());
    const mesNom = MESOS[ref.getMonth()]!;

    // Estructura 2026/juny/ (es crea encara que de moment quedi buida; la Fase 2
    // hi posarà factures, comprovants, fitxes i personal).
    await ensureFolderPath(token, [any, mesNom], rootId);

    // Hostes.xlsx ACUMULATIU a l'arrel (es va actualitzant cada mes).
    const hostes = await buildHostesXlsx();
    await uploadOrUpdateFile(token, {
      name: 'Hostes.xlsx',
      parentId: rootId,
      mimeType: XLSX_MIME,
      data: hostes,
    });

    await audit({
      usuariId: actorId,
      accio: 'DESCARREGA',
      entitat: 'drive_export',
      detall: { any, mes: mesNom, fitxers: ['Hostes.xlsx'] },
      ip: clientIp(req),
    });

    return ok({ ok: true, carpeta: `${any}/${mesNom}`, fitxers: ['Hostes.xlsx'] });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
