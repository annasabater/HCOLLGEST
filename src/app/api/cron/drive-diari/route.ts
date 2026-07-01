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
  PDF_MIME,
} from '@/lib/drive';
import {
  buildRegistresPdfs,
  buildFitxesPdfs,
  buildComprovantsPdfs,
  type PdfFitxer,
} from '@/lib/exports/pdfs-mes';

const ESTABLIMENT_ID = 'hostal-coll';

/**
 * GET /api/cron/drive-diari — export DIARI a Google Drive.
 * Cada dia arxiva, DINS LA CARPETA DE L'ANY (no del mes), el "Libro de Registro",
 * les fitxes de registre i els comprovants de Mossos de les estades/comunicacions
 * recents (finestra de 2 dies, idempotent: actualitza els fitxers existents).
 * L'invoca el cron de Vercel (Bearer CRON_SECRET) o un ADMIN (?dies=N per ampliar).
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

    let rootId = est.driveFolderId;
    if (!rootId) {
      rootId = await ensureFolder(token, 'Hostal Coll — Gestió');
      await prisma.establiment.update({ where: { id: ESTABLIMENT_ID }, data: { driveFolderId: rootId } });
    }

    // Finestra: últims N dies (2 per defecte) per captar registres/comunicacions recents.
    const dies = Math.max(1, Number(new URL(req.url).searchParams.get('dies')) || 2);
    const now = new Date();
    const fins = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const desde = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dies - 1), 0, 0, 0, 0);
    const any = String(now.getFullYear());

    // Tot va dins la carpeta de l'ANY (no del mes).
    const yearFolderId = await ensureFolderPath(token, [any], rootId);

    const fitxers: string[] = [];
    const errors: string[] = [];
    async function pujarLot(subcarpeta: string, gen: () => Promise<PdfFitxer[]>) {
      try {
        const llista = await gen();
        if (llista.length === 0) return;
        const carpeta = await ensureFolder(token, subcarpeta, yearFolderId);
        for (const f of llista) {
          try {
            await uploadOrUpdateFile(token, { name: f.name, parentId: carpeta, mimeType: PDF_MIME, data: f.data });
            fitxers.push(`${subcarpeta}/${f.name}`);
          } catch (e) {
            errors.push(`${subcarpeta}/${f.name}: ${e instanceof Error ? e.message : 'error'}`);
          }
        }
      } catch (e) {
        errors.push(`${subcarpeta}: ${e instanceof Error ? e.message : 'error'}`);
      }
    }

    await pujarLot('Llibre de registre', () => buildRegistresPdfs(desde, fins));
    await pujarLot('Fitxes de registre', () => buildFitxesPdfs(desde, fins));
    await pujarLot('Comprovants de Mossos', () => buildComprovantsPdfs(desde, fins));

    await audit({
      usuariId: actorId,
      accio: 'DESCARREGA',
      entitat: 'drive_export',
      detall: { tipus: 'diari', any, dies, fitxers, errors },
      ip: clientIp(req),
    });

    return ok({ ok: errors.length === 0, carpeta: any, fitxers, errors });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
