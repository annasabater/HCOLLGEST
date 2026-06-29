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
  PDF_MIME,
} from '@/lib/drive';
import { buildHostesXlsx } from '@/lib/exports/hostes-xlsx';
import { buildLlibreXlsxMes } from '@/lib/exports/llibre-xlsx';
import { buildIngressosDespesesXlsx } from '@/lib/exports/ingressos-despeses-xlsx';
import { buildPersonalXlsx } from '@/lib/exports/personal-xlsx';
import {
  buildFitxesPdfs,
  buildComprovantsPdfs,
  buildFacturesPdfs,
  type PdfFitxer,
} from '@/lib/exports/pdfs-mes';

const ESTABLIMENT_ID = 'hostal-coll';
const MESOS = [
  'gener', 'febrer', 'març', 'abril', 'maig', 'juny',
  'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre',
];

/**
 * GET /api/cron/drive-mensual — export mensual a Google Drive.
 * L'invoca el cron de Vercel (dia 1, amb Bearer CRON_SECRET) per arxivar el mes
 * ANTERIOR, o un ADMIN manualment des de Configuració (?mes=actual per provar amb
 * el mes en curs). Cada fitxer es genera i puja per separat: si un falla, els
 * altres continuen i el problema es retorna a `errors`.
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
    const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);

    // Estructura 2026/juny/ (la Fase 2b hi posarà també els PDF per registre).
    const monthFolderId = await ensureFolderPath(token, [any, mesNom], rootId);

    const fitxers: string[] = [];
    const errors: string[] = [];
    async function fer(name: string, parentId: string, gen: () => Promise<Buffer>) {
      try {
        const data = await gen();
        await uploadOrUpdateFile(token, { name, parentId, mimeType: XLSX_MIME, data });
        fitxers.push(name);
      } catch (e) {
        errors.push(`${name}: ${e instanceof Error ? e.message : 'error'}`);
      }
    }

    // Acumulatius a l'arrel (es van actualitzant cada mes).
    await fer('Hostes.xlsx', rootId, () => buildHostesXlsx());
    // Del mes, dins la carpeta del mes.
    // Llibre de registre del mes (tots els camps del registre legal).
    await fer('Llibre de registre.xlsx', monthFolderId, () =>
      buildLlibreXlsxMes(monthStart, monthEnd),
    );
    await fer('Ingressos i despeses.xlsx', monthFolderId, () =>
      buildIngressosDespesesXlsx(monthStart, monthEnd),
    );
    await fer('Personal.xlsx', monthFolderId, () => buildPersonalXlsx(monthStart, monthEnd));

    // PDFs del mes, cadascun a la seva subcarpeta dins la carpeta del mes.
    async function pujarLot(subcarpeta: string, gen: () => Promise<PdfFitxer[]>) {
      try {
        const llista = await gen();
        if (llista.length === 0) return;
        const carpeta = await ensureFolder(token, subcarpeta, monthFolderId);
        for (const f of llista) {
          try {
            await uploadOrUpdateFile(token, {
              name: f.name,
              parentId: carpeta,
              mimeType: PDF_MIME,
              data: f.data,
            });
            fitxers.push(`${subcarpeta}/${f.name}`);
          } catch (e) {
            errors.push(`${subcarpeta}/${f.name}: ${e instanceof Error ? e.message : 'error'}`);
          }
        }
      } catch (e) {
        errors.push(`${subcarpeta}: ${e instanceof Error ? e.message : 'error'}`);
      }
    }

    await pujarLot('Fitxes de registre', () => buildFitxesPdfs(monthStart, monthEnd));
    await pujarLot('Comprovants de Mossos', () => buildComprovantsPdfs(monthStart, monthEnd));
    await pujarLot('factures', () => buildFacturesPdfs(monthStart, monthEnd, false));
    await pujarLot('factures + custodia', () => buildFacturesPdfs(monthStart, monthEnd, true));

    await audit({
      usuariId: actorId,
      accio: 'DESCARREGA',
      entitat: 'drive_export',
      detall: { any, mes: mesNom, fitxers, errors },
      ip: clientIp(req),
    });

    return ok({ ok: errors.length === 0, carpeta: `${any}/${mesNom}`, fitxers, errors });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
// Pot generar i pujar molts PDFs (fitxes, comprovants, factures) en una crida.
export const maxDuration = 300;
